-- profiles: new, self-editable fields
alter table public.profiles
  add column phone text,
  add column weekly_target_hours numeric(5,2);

-- Allow self-update (id = own) — there was no UPDATE policy at all before
create policy "profiles_update_own"
on public.profiles for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

-- Trigger instead of a fragile RLS subquery: prevents self-setting
-- role/active unless already admin (privilege escalation guard)
create or replace function private.guard_profile_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role or new.active is distinct from old.active then
    if (select private.current_role()) is distinct from 'admin' then
      raise exception 'Only admins may change role or active status.';
    end if;
  end if;
  return new;
end;
$$;

create trigger profiles_guard_protected_fields
before update on public.profiles
for each row
execute function private.guard_profile_protected_fields();

-- Hourly wage: separate table so RLS applies cleanly per row
create table public.employee_compensation (
  profile_id uuid primary key references public.profiles(id) on delete cascade,
  hourly_wage numeric(10,2),
  updated_at timestamptz not null default now()
);
comment on table public.employee_compensation is
  'Per-employee hourly wage — self-readable, admin-writable only accounting data.';

alter table public.employee_compensation enable row level security;

create trigger employee_compensation_set_updated_at
before update on public.employee_compensation
for each row
execute function public.set_updated_at();

create policy "compensation_select_self_or_admin"
on public.employee_compensation for select
to authenticated
using (
  profile_id = (select auth.uid())
  or (select private.current_role()) = 'admin'
);

create policy "compensation_admin_insert"
on public.employee_compensation for insert
to authenticated
with check ((select private.current_role()) = 'admin');

create policy "compensation_admin_update"
on public.employee_compensation for update
to authenticated
using ((select private.current_role()) = 'admin')
with check ((select private.current_role()) = 'admin');
