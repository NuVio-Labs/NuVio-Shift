-- Local development seed data.
-- Runs automatically on `supabase db reset` against your LOCAL Supabase
-- instance only. Never applied to a remote/hosted project automatically.
--
-- Seeds the four Saturdays of September 2026 (see CLAUDE.md section 7)
-- with empty early/late shifts so the schedule UI has rows to render
-- before any employees exist.
--
-- Test profiles are intentionally NOT seeded here: `profiles.id` must
-- reference a real `auth.users` row, and real users should come from
-- Supabase Auth (dashboard or CLI), not a raw SQL insert into auth.users.

insert into public.shifts (shift_date, shift_type)
values
  ('2026-09-05', 'early'),
  ('2026-09-05', 'late'),
  ('2026-09-12', 'early'),
  ('2026-09-12', 'late'),
  ('2026-09-19', 'early'),
  ('2026-09-19', 'late'),
  ('2026-09-26', 'early'),
  ('2026-09-26', 'late')
on conflict (shift_date, shift_type) do nothing;
