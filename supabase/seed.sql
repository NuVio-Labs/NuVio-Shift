-- Local development seed data.
-- Runs automatically on `supabase db reset` against your LOCAL Supabase
-- instance only. Never applied to a remote/hosted project automatically.
--
-- Seeds one company with two recurring Saturday slots (Früh/Spät) plus one
-- one-off weekday shift, so the schedule UI has something to render before
-- any employees exist.
--
-- Note: migrations run before this seed, so the flexible-shifts migration
-- never sees 'Lokale Test-Firma' — its templates are created here instead.
--
-- Test profiles are intentionally NOT seeded here: `profiles.id` must
-- reference a real `auth.users` row, and real users should come from
-- Supabase Auth (dashboard or CLI), not a raw SQL insert into auth.users.

insert into public.companies (name)
values ('Lokale Test-Firma')
on conflict do nothing;

insert into public.shift_templates (company_id, label, weekday, start_time, end_time)
select (select id from public.companies where name = 'Lokale Test-Firma' order by created_at limit 1), label, 6, start_time, end_time
from (
  values
    ('Früh', '08:00'::time, '14:00'::time),
    ('Spät', '14:00'::time, '20:00'::time)
) as t (label, start_time, end_time);

insert into public.shifts (company_id, shift_date, start_time, end_time, label)
values (
  (select id from public.companies where name = 'Lokale Test-Firma' order by created_at limit 1),
  '2026-11-03',
  '09:00',
  '12:00',
  'Inventur'
);
