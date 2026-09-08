-- companies
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

-- company_id on profiles/shifts (nullable -> backfill -> not null)
alter table public.profiles add column company_id uuid references public.companies(id);
alter table public.shifts add column company_id uuid references public.companies(id);

insert into public.companies (name) values ('Aral Tankstelle, Daniel Cloosters');
update public.profiles set company_id = (select id from public.companies limit 1);
update public.shifts set company_id = (select id from public.companies limit 1);

alter table public.profiles alter column company_id set not null;
alter table public.shifts alter column company_id set not null;

-- Unique constraint must be per-company, not global
alter table public.shifts drop constraint shifts_shift_date_type_unique;
alter table public.shifts add constraint shifts_company_date_type_unique
  unique (company_id, shift_date, shift_type);

-- current_company_id(), mirrors private.current_role()
create or replace function private.current_company_id()
returns uuid
language sql
stable security definer
set search_path = ''
as $$
  select company_id from public.profiles
  where id = (select auth.uid()) and active = true;
$$;

alter table public.companies enable row level security;
create policy "companies_select_own"
on public.companies for select
to authenticated
using (id = (select private.current_company_id()));
grant select on public.companies to authenticated;

-- Extend existing policies to be company-scoped
drop policy "profiles_select_scheduler_admin" on public.profiles;
create policy "profiles_select_scheduler_admin" on public.profiles for select to authenticated
using ((select private.current_role()) = any(array['scheduler','admin'])
       and company_id = (select private.current_company_id()));

drop policy "shifts_select_scheduler_admin" on public.shifts;
create policy "shifts_select_scheduler_admin" on public.shifts for select to authenticated
using ((select private.current_role()) = any(array['scheduler','admin'])
       and company_id = (select private.current_company_id()));

drop policy "shifts_insert_scheduler" on public.shifts;
create policy "shifts_insert_scheduler" on public.shifts for insert to authenticated
with check ((select private.current_role()) = 'scheduler'
            and company_id = (select private.current_company_id()));

drop policy "shifts_update_scheduler" on public.shifts;
create policy "shifts_update_scheduler" on public.shifts for update to authenticated
using ((select private.current_role()) = 'scheduler'
       and company_id = (select private.current_company_id()))
with check ((select private.current_role()) = 'scheduler'
            and company_id = (select private.current_company_id()));

drop policy "compensation_select_self_or_admin" on public.employee_compensation;
create policy "compensation_select_self_or_admin" on public.employee_compensation for select to authenticated
using (profile_id = (select auth.uid())
       or ((select private.current_role()) = 'admin'
           and exists (select 1 from public.profiles t
                       where t.id = employee_compensation.profile_id
                         and t.company_id = (select private.current_company_id()))));

drop policy "compensation_admin_insert" on public.employee_compensation;
create policy "compensation_admin_insert" on public.employee_compensation for insert to authenticated
with check ((select private.current_role()) = 'admin'
            and exists (select 1 from public.profiles t
                        where t.id = employee_compensation.profile_id
                          and t.company_id = (select private.current_company_id())));

drop policy "compensation_admin_update" on public.employee_compensation;
create policy "compensation_admin_update" on public.employee_compensation for update to authenticated
using ((select private.current_role()) = 'admin'
       and exists (select 1 from public.profiles t
                   where t.id = employee_compensation.profile_id
                     and t.company_id = (select private.current_company_id())))
with check ((select private.current_role()) = 'admin'
            and exists (select 1 from public.profiles t
                        where t.id = employee_compensation.profile_id
                          and t.company_id = (select private.current_company_id())));

-- Prevent self-changing company_id, same guard as role/active
create or replace function private.guard_profile_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     or new.active is distinct from old.active
     or new.company_id is distinct from old.company_id then
    if (select auth.uid()) is not null and (select private.current_role()) is distinct from 'admin' then
      raise exception 'Only admins may change role, active status, or company.';
    end if;
  end if;
  return new;
end;
$$;

-- Defense-in-depth: a shift's employee must belong to the shift's own company
create or replace function private.guard_shift_employee_company_match()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.employee_id is not null then
    if not exists (select 1 from public.profiles p
                   where p.id = new.employee_id and p.company_id = new.company_id) then
      raise exception 'Employee does not belong to this shift''s company.';
    end if;
  end if;
  return new;
end;
$$;

create trigger shifts_guard_employee_company_match
before insert or update on public.shifts
for each row
execute function private.guard_shift_employee_company_match();

-- invites: deliberately no policies, no grants to anon/authenticated —
-- every access goes through the service-role client (see lib/supabase/service.ts).
create table public.invites (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id),
  token text not null unique,
  role text not null check (role in ('admin','scheduler','employee')),
  created_by uuid not null references public.profiles(id),
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
alter table public.invites enable row level security;
