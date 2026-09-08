-- The guard must only stop an authenticated app user from escalating their
-- own role/active status. It must NOT block direct database administration
-- (Supabase Studio, service-role, migrations) where there is no JWT/auth.uid()
-- context at all — that's the "authorized internal process" account
-- provisioning depends on.
create or replace function private.guard_profile_protected_fields()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.role is distinct from old.role or new.active is distinct from old.active then
    if (select auth.uid()) is not null and (select private.current_role()) is distinct from 'admin' then
      raise exception 'Only admins may change role or active status.';
    end if;
  end if;
  return new;
end;
$$;
