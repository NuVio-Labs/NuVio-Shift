import { createServiceRoleClient } from "@/lib/supabase/service";
import type { UserRole } from "@/types/domain";

export type InviteLookupResult =
  | { status: "invalid" }
  | { status: "expired" }
  | { status: "used" }
  | { status: "valid"; companyName: string; role: UserRole };

/**
 * Public lookup used by the unauthenticated `/einladen/[token]` page.
 * `invites` has no client-facing RLS grants at all, so this always goes
 * through the service-role client — see `@/lib/supabase/service`.
 */
export async function getInviteByToken(token: string): Promise<InviteLookupResult> {
  if (!token) {
    return { status: "invalid" };
  }

  const supabase = createServiceRoleClient();

  const { data: invite, error } = await supabase
    .from("invites")
    .select("company_id, role, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (error || !invite) {
    return { status: "invalid" };
  }

  if (invite.used_at) {
    return { status: "used" };
  }

  if (new Date(invite.expires_at) < new Date()) {
    return { status: "expired" };
  }

  const { data: company } = await supabase
    .from("companies")
    .select("name")
    .eq("id", invite.company_id)
    .maybeSingle();

  return { status: "valid", companyName: company?.name ?? "", role: invite.role as UserRole };
}
