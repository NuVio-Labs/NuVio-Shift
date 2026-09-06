-- NuVio Shift — M2: core schema (profiles, shifts)
-- Application data alongside Supabase-managed auth.users.

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null,
  role        text not null,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint profiles_role_check check (role in ('admin', 'scheduler', 'employee'))
);

comment on table public.profiles is
  'Application-level data for each authenticated user (role, name, active status).';

alter table public.profiles enable row level security;

-- ---------------------------------------------------------------------------
-- shifts
-- ---------------------------------------------------------------------------

create table public.shifts (
  id           uuid primary key default gen_random_uuid(),
  shift_date   date not null,
  shift_type   text not null,
  employee_id  uuid references public.profiles (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint shifts_shift_type_check check (shift_type in ('early', 'late')),
  constraint shifts_shift_date_type_unique unique (shift_date, shift_type),
  -- Scope 1 only schedules Saturdays. isodow: Monday=1 ... Sunday=7.
  constraint shifts_saturday_check check (extract(isodow from shift_date) = 6)
);

comment on table public.shifts is
  'One row per Saturday early/late shift. Scope 1: at most one employee per shift.';

create index shifts_employee_id_idx on public.shifts (employee_id);

alter table public.shifts enable row level security;

-- ---------------------------------------------------------------------------
-- keep updated_at current on every update
-- ---------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger shifts_set_updated_at
before update on public.shifts
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Explicit least-privilege grants.
--
-- Supabase grants ALL (select/insert/update/delete) on every new `public`
-- table to `anon` and `authenticated` by default, independent of RLS. RLS
-- only filters rows within whatever the grants already allow, so it does
-- not "take back" an unwanted grant. Start from zero and grant back only
-- what Scope 1 needs.
-- ---------------------------------------------------------------------------

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.shifts from anon, authenticated;

-- profiles: read-only for the app; writes happen via an internal process
-- (Supabase Auth / service role), never through the anon/authenticated API.
grant select on table public.profiles to authenticated;

-- shifts: Scheduler assigns/changes employees via insert+update. No delete —
-- removing an assignment clears employee_id on the existing row instead.
grant select, insert, update on table public.shifts to authenticated;

-- ---------------------------------------------------------------------------
-- private schema: RLS helper functions
--
-- `private` is not an exposed schema, so it is never reachable via the
-- Data API. `current_role()` is security definer so it can read a user's
-- own role from `profiles` without re-triggering the `profiles` RLS
-- policies (which would otherwise recurse). It also enforces that only
-- *active* profiles grant any role-based access — a deactivated user gets
-- no scheduler/admin privileges and is treated as roleless (null).
-- ---------------------------------------------------------------------------

create schema if not exists private;

create or replace function private.current_role()
returns text
language sql
security definer
set search_path = ''
stable
as $$
  select role
  from public.profiles
  where id = (select auth.uid())
    and active = true;
$$;

revoke execute on function private.current_role() from public;
grant execute on function private.current_role() to authenticated;
grant usage on schema private to authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies: profiles
--
-- employee : read own profile only
-- scheduler: read all profiles (needed to assign employees to shifts)
-- admin    : read all profiles (management/accounting visibility)
-- no role gets insert/update/delete via the app in Scope 1 — accounts are
-- created through an internal process (Supabase Auth), not app UI.
--
-- Function calls are wrapped in `(select ...)` so Postgres evaluates them
-- once per query (an InitPlan) instead of once per row.
-- ---------------------------------------------------------------------------

create policy "profiles_select_own"
on public.profiles
for select
to authenticated
using (id = (select auth.uid()));

create policy "profiles_select_scheduler_admin"
on public.profiles
for select
to authenticated
using ((select private.current_role()) in ('scheduler', 'admin'));

-- ---------------------------------------------------------------------------
-- RLS policies: shifts
--
-- employee : read own assigned shifts only, and only while active — an
--            employee_id match alone is not enough (current_role() is
--            null once the profile is deactivated).
-- scheduler: read all shifts, create shifts, assign/change/remove employees
-- admin    : read all shifts, no write access (information/accounting role)
-- ---------------------------------------------------------------------------

create policy "shifts_select_own"
on public.shifts
for select
to authenticated
using (
  employee_id = (select auth.uid())
  and (select private.current_role()) is not null
);

create policy "shifts_select_scheduler_admin"
on public.shifts
for select
to authenticated
using ((select private.current_role()) in ('scheduler', 'admin'));

create policy "shifts_insert_scheduler"
on public.shifts
for insert
to authenticated
with check ((select private.current_role()) = 'scheduler');

create policy "shifts_update_scheduler"
on public.shifts
for update
to authenticated
using ((select private.current_role()) = 'scheduler')
with check ((select private.current_role()) = 'scheduler');
