-- profiles: RLS policy alone isn't enough, Postgres also requires the
-- baseline table-level privilege before RLS is even evaluated.
grant update on public.profiles to authenticated;

-- employee_compensation was created with Supabase's default privileges,
-- which grant far more than needed (including anon). Narrow it down to
-- exactly the shifts-table pattern: authenticated gets only the verbs the
-- app actually uses, anon gets nothing.
revoke all on public.employee_compensation from anon;
revoke all on public.employee_compensation from authenticated;
grant select, insert, update on public.employee_compensation to authenticated;
