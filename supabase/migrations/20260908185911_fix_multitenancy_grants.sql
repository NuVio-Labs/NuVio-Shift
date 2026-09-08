-- companies and invites picked up Supabase's default broad privileges
-- (including anon!) on CREATE TABLE. Narrow to least-privilege, matching
-- the existing shifts/profiles pattern.
revoke all on public.companies from anon;
revoke all on public.companies from authenticated;
grant select on public.companies to authenticated;

-- invites: no client-side access at all, everything goes through the
-- service-role client (see lib/supabase/service.ts).
revoke all on public.invites from anon;
revoke all on public.invites from authenticated;
