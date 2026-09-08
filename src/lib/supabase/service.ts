import { createClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client authenticated with the service role key.
 * Bypasses RLS entirely.
 *
 * Never import this into a Client Component. Never use it for normal app
 * data (profiles, shifts) — those continue to go through the
 * session-scoped client in `@/lib/supabase/server`, respecting RLS as the
 * primary access control.
 *
 * Scope: exclusively for two things that legitimately need to bypass RLS —
 * 1. `sendPushToUser()` (see `@/lib/push/internal`), which needs to
 *    read/clean up *another* user's `push_subscriptions` rows (e.g. a
 *    scheduler's shift mutation notifying the affected employee) —
 *    something the acting user's own RLS-scoped session can never see, by
 *    design (`push_subscriptions` RLS stays strictly "own rows only").
 * 2. Invite creation/redemption (see `@/lib/admin/invites` and
 *    `@/lib/invites/actions`) — `public.invites` deliberately has no RLS
 *    policies or grants for `anon`/`authenticated` at all, since accepting
 *    an invite happens before the visitor has any session, and issuing one
 *    involves writing rows an admin's normal session has no access to.
 */
export function createServiceRoleClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    },
  );
}
