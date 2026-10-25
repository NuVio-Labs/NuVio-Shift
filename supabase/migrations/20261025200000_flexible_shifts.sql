-- NuVio Shift — flexible shifts
--
-- Replaces the hard-coded Saturday early/late model with:
--   1. shift_templates: recurring slots per company and weekday
--      (e.g. "Früh, Samstag, 08:00–14:00" or "Putzen, Dienstag, 09:00–12:00").
--   2. shifts: concrete rows with their own start/end time and label.
--      A shift either fills a template slot on one date (template_id set)
--      or is a one-off shift on any date (template_id null).
--
-- Existing data is migrated 1:1: every company gets the former Saturday
-- Früh/Spät slots as templates, and every existing shift row is linked to
-- the matching template with its times copied over. The schedule therefore
-- looks exactly the same after this migration as before it.
--
-- Not supported yet: shifts crossing midnight (end_time must be > start_time).

-- ---------------------------------------------------------------------------
-- shift_templates
-- ---------------------------------------------------------------------------

create table public.shift_templates (
  id          uuid primary key default gen_random_uuid(),
  company_id  uuid not null references public.companies (id) on delete cascade,
  label       text not null,
  -- ISO weekday, matches extract(isodow ...): Monday = 1 … Sunday = 7
  weekday     smallint not null,
  start_time  time not null,
  end_time    time not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint shift_templates_weekday_check check (weekday between 1 and 7),
  constraint shift_templates_time_order_check check (end_time > start_time),
  constraint shift_templates_label_check check (char_length(btrim(label)) between 1 and 40)
);

comment on table public.shift_templates is
  'Recurring shift slots per company and weekday. Deactivated instead of deleted so past shifts keep their reference.';

create index shift_templates_company_id_idx on public.shift_templates (company_id);

alter table public.shift_templates enable row level security;

create trigger shift_templates_set_updated_at
before update on public.shift_templates
for each row execute function public.set_updated_at();

revoke all on table public.shift_templates from anon, authenticated;
grant select, insert, update on table public.shift_templates to authenticated;

-- Every active member of the company may read its templates (employees need
-- labels/times for their own shifts; schedulers/admins for the schedule).
create policy "shift_templates_select_company"
on public.shift_templates for select
to authenticated
using (
  company_id = (select private.current_company_id())
  and (select private.current_role()) is not null
);

-- Admins and schedulers manage templates — both roles configure how the
-- schedule is structured (a household owner usually holds just one of them).
create policy "shift_templates_insert_admin_scheduler"
on public.shift_templates for insert
to authenticated
with check (
  (select private.current_role()) = any (array['admin', 'scheduler'])
  and company_id = (select private.current_company_id())
);

create policy "shift_templates_update_admin_scheduler"
on public.shift_templates for update
to authenticated
using (
  (select private.current_role()) = any (array['admin', 'scheduler'])
  and company_id = (select private.current_company_id())
)
with check (
  (select private.current_role()) = any (array['admin', 'scheduler'])
  and company_id = (select private.current_company_id())
);

-- ---------------------------------------------------------------------------
-- Seed the former fixed Saturday slots as templates for every company
-- ---------------------------------------------------------------------------

insert into public.shift_templates (company_id, label, weekday, start_time, end_time)
select c.id, t.label, 6, t.start_time, t.end_time
from public.companies c
cross join (
  values
    ('Früh', '08:00'::time, '14:00'::time),
    ('Spät', '14:00'::time, '20:00'::time)
) as t (label, start_time, end_time);

-- ---------------------------------------------------------------------------
-- shifts: own times, label and optional template link
-- ---------------------------------------------------------------------------

alter table public.shifts
  add column start_time  time,
  add column end_time    time,
  add column label       text,
  add column template_id uuid references public.shift_templates (id) on delete set null;

update public.shifts s
set
  start_time  = st.start_time,
  end_time    = st.end_time,
  label       = st.label,
  template_id = st.id
from public.shift_templates st
where st.company_id = s.company_id
  and st.weekday = 6
  and st.label = case s.shift_type when 'early' then 'Früh' when 'late' then 'Spät' end;

alter table public.shifts
  alter column start_time set not null,
  alter column end_time set not null,
  alter column label set not null;

-- Drop the fixed model: Saturday-only, early/late-only, one per type and day.
alter table public.shifts drop constraint shifts_saturday_check;
alter table public.shifts drop constraint shifts_company_date_type_unique;
alter table public.shifts drop constraint shifts_shift_type_check;
alter table public.shifts drop column shift_type;

alter table public.shifts
  add constraint shifts_time_order_check check (end_time > start_time),
  add constraint shifts_label_check check (char_length(btrim(label)) between 1 and 40);

-- A template slot exists at most once per date and company. One-off shifts
-- (template_id null) are unrestricted — several per day are allowed.
create unique index shifts_company_date_template_unique
on public.shifts (company_id, shift_date, template_id)
where template_id is not null;

create index shifts_company_date_idx on public.shifts (company_id, shift_date);

comment on table public.shifts is
  'Concrete shifts: either a filled template slot on one date (template_id set) or a one-off shift. employee_id null = open shift.';

-- ---------------------------------------------------------------------------
-- Defense-in-depth: a shift's template must belong to the shift's company
-- and fall on the right weekday.
-- ---------------------------------------------------------------------------

create or replace function private.guard_shift_template_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.template_id is not null then
    if not exists (
      select 1 from public.shift_templates t
      where t.id = new.template_id
        and t.company_id = new.company_id
        and t.weekday = extract(isodow from new.shift_date)
    ) then
      raise exception 'Template does not match this shift''s company or weekday.';
    end if;
  end if;
  return new;
end;
$$;

create trigger shifts_guard_template_match
before insert or update of template_id, shift_date, company_id on public.shifts
for each row
execute function private.guard_shift_template_match();

-- ---------------------------------------------------------------------------
-- Delete: one-off shifts can now be removed entirely by the scheduler.
-- (Template slots are simply unassigned — deleting their row is harmless,
-- the empty slot comes back from the template.)
-- ---------------------------------------------------------------------------

grant delete on table public.shifts to authenticated;

create policy "shifts_delete_scheduler"
on public.shifts for delete
to authenticated
using (
  (select private.current_role()) = 'scheduler'
  and company_id = (select private.current_company_id())
);
