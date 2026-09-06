-- NuVio Shift — M9: push_subscriptions
-- One row per registered device/browser. A user can have many rows
-- (phone, desktop, tablet); only the endpoint itself must be unique.

create table public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles (id) on delete cascade,
  endpoint    text not null,
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint push_subscriptions_endpoint_unique unique (endpoint)
);

comment on table public.push_subscriptions is
  'Web Push subscriptions, one row per device. Multiple rows per user_id are expected; endpoint is globally unique.';

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

-- Reuses the updated_at trigger function already defined in the M2 migration
-- (public.set_updated_at()) — no need for a second, redundant one.
create trigger push_subscriptions_set_updated_at
before update on public.push_subscriptions
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- Explicit least-privilege grants (see M2 migration for why this is needed:
-- Supabase grants ALL on new tables to anon/authenticated by default).
-- ---------------------------------------------------------------------------

revoke all on table public.push_subscriptions from anon, authenticated;
grant select, insert, update, delete on table public.push_subscriptions to authenticated;

-- ---------------------------------------------------------------------------
-- RLS policies: push_subscriptions
--
-- No role check needed here — every role (admin/scheduler/employee) manages
-- only their own devices, so the policy is purely ownership-based.
-- ---------------------------------------------------------------------------

create policy "push_subscriptions_select_own"
on public.push_subscriptions
for select
to authenticated
using (user_id = (select auth.uid()));

create policy "push_subscriptions_insert_own"
on public.push_subscriptions
for insert
to authenticated
with check (user_id = (select auth.uid()));

create policy "push_subscriptions_update_own"
on public.push_subscriptions
for update
to authenticated
using (user_id = (select auth.uid()))
with check (user_id = (select auth.uid()));

create policy "push_subscriptions_delete_own"
on public.push_subscriptions
for delete
to authenticated
using (user_id = (select auth.uid()));
