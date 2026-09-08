import { createClient } from "@/lib/supabase/server";

export type OwnProfileSettings = {
  name: string;
  phone: string | null;
  weeklyTargetHours: number | null;
  email: string | null;
  hourlyWage: number | null;
};

export type GetOwnProfileSettingsResult =
  | { status: "ok"; settings: OwnProfileSettings }
  | { status: "error" };

/**
 * Full self-service settings snapshot for the "Profil" tab. Separate from
 * `getCurrentUserProfile()` (lib/auth/profile.ts), which stays minimal since
 * it's read on every /app/* request for role checks.
 */
export async function getOwnProfileSettings(): Promise<GetOwnProfileSettingsResult> {
  const supabase = await createClient();

  const { data: claimsData, error: claimsError } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (claimsError || !userId) {
    return { status: "error" };
  }

  const [{ data: profile, error: profileError }, { data: compensation }] = await Promise.all([
    supabase
      .from("profiles")
      .select("name, phone, weekly_target_hours")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("employee_compensation")
      .select("hourly_wage")
      .eq("profile_id", userId)
      .maybeSingle(),
  ]);

  if (profileError || !profile) {
    return { status: "error" };
  }

  return {
    status: "ok",
    settings: {
      name: profile.name,
      phone: profile.phone,
      weeklyTargetHours: profile.weekly_target_hours,
      email: claimsData.claims.email ?? null,
      hourlyWage: compensation?.hourly_wage ?? null,
    },
  };
}
