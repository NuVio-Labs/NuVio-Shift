"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";

export type ProfileMutationState =
  | { status: "idle" }
  | { status: "ok" }
  | { status: "error"; message: string };

const GENERIC_ERROR: ProfileMutationState = {
  status: "error",
  message: "Deine Angaben konnten nicht gespeichert werden. Bitte versuche es erneut.",
};

const MAX_WEEKLY_TARGET_HOURS = 80;

export async function updateOwnProfile(
  _prevState: ProfileMutationState,
  formData: FormData,
): Promise<ProfileMutationState> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    return { status: "error", message: "Bitte melde dich erneut an." };
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) {
    return { status: "error", message: "Bitte gib deinen Namen ein." };
  }

  const phone = String(formData.get("phone") ?? "").trim();
  const weeklyTargetHoursRaw = String(formData.get("weeklyTargetHours") ?? "").trim();

  let weeklyTargetHours: number | null = null;
  if (weeklyTargetHoursRaw !== "") {
    const parsed = Number(weeklyTargetHoursRaw);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_WEEKLY_TARGET_HOURS) {
      return {
        status: "error",
        message: `Wochenstunden müssen zwischen 0 und ${MAX_WEEKLY_TARGET_HOURS} liegen.`,
      };
    }
    weeklyTargetHours = parsed;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      name,
      phone: phone || null,
      weekly_target_hours: weeklyTargetHours,
    })
    .eq("id", userId);

  if (error) {
    return GENERIC_ERROR;
  }

  revalidatePath("/app/einstellungen");
  revalidatePath("/app");

  return { status: "ok" };
}
