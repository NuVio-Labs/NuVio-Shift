-- Local development seed data.
-- Runs automatically on `supabase db reset` against your LOCAL Supabase
-- instance only. Never applied to a remote/hosted project automatically.
--
-- Seeds one company plus the four Saturdays of September 2026 with empty
-- early/late shifts so the schedule UI has rows to render before any
-- employees exist.
--
-- Test profiles are intentionally NOT seeded here: `profiles.id` must
-- reference a real `auth.users` row, and real users should come from
-- Supabase Auth (dashboard or CLI), not a raw SQL insert into auth.users.

insert into public.companies (name)
values ('Lokale Test-Firma')
on conflict do nothing;

insert into public.shifts (company_id, shift_date, shift_type)
select (select id from public.companies order by created_at limit 1), shift_date, shift_type
from (
  values
    ('2026-09-05'::date, 'early'::text),
    ('2026-09-05', 'late'),
    ('2026-09-12', 'early'),
    ('2026-09-12', 'late'),
    ('2026-09-19', 'early'),
    ('2026-09-19', 'late'),
    ('2026-09-26', 'early'),
    ('2026-09-26', 'late')
) as saturdays(shift_date, shift_type)
on conflict (company_id, shift_date, shift_type) do nothing;
