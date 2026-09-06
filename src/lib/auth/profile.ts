import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";

export type CurrentUserProfile = {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
};

export type CurrentUserProfileResult =
  | { status: "unauthenticated" }
  | { status: "no_profile" }
  | { status: "inactive"; profile: CurrentUserProfile }
  | { status: "ok"; profile: CurrentUserProfile }
  | { status: "error" };

/**
 * Loads the application profile (name, role, active) for the currently
 * authenticated user. The role must never be trusted from the browser —
 * this always reads it fresh from `public.profiles` on the server.
 */
export async function getCurrentUserProfile(): Promise<CurrentUserProfileResult> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    return { status: "unauthenticated" };
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role, active")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    return { status: "error" };
  }

  if (!data) {
    return { status: "no_profile" };
  }

  const profile: CurrentUserProfile = {
    id: data.id,
    name: data.name,
    role: data.role as UserRole,
    active: data.active,
  };

  return profile.active
    ? { status: "ok", profile }
    : { status: "inactive", profile };
}
