import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types/domain";

export type ManagedProfile = {
  id: string;
  name: string;
  role: UserRole;
  active: boolean;
};

export type GetManagedProfilesResult =
  | { status: "ok"; profiles: ManagedProfile[] }
  | { status: "error" };

/**
 * All profiles for the Admin's management view — unlike
 * `getAssignableEmployees()` (M5, only active employee/scheduler for a
 * shift dropdown), this intentionally includes inactive profiles and every
 * role, since the Admin needs an overview of the whole team.
 */
export async function getManagedProfiles(): Promise<GetManagedProfilesResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role, active")
    .order("name", { ascending: true })
    .returns<ManagedProfile[]>();

  if (error) {
    return { status: "error" };
  }

  return { status: "ok", profiles: data };
}
