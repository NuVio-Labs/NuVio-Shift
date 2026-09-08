"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";

export type GetEmployeeCompensationMapResult =
  | { status: "ok"; compensationByProfileId: Record<string, number | null> }
  | { status: "error" };

/** Admin-only: current hourly wage for every profile, keyed by profile id. */
export async function getEmployeeCompensationMap(): Promise<GetEmployeeCompensationMapResult> {
  const result = await getCurrentUserProfile();
  if (result.status !== "ok" || result.profile.role !== "admin") {
    return { status: "error" };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.from("employee_compensation").select("profile_id, hourly_wage");

  if (error) {
    return { status: "error" };
  }

  const compensationByProfileId: Record<string, number | null> = {};
  for (const row of data) {
    compensationByProfileId[row.profile_id] = row.hourly_wage;
  }

  return { status: "ok", compensationByProfileId };
}

export type SetHourlyWageResult =
  | { status: "ok" }
  | { status: "error"; message: string };

const GENERIC_ERROR: SetHourlyWageResult = {
  status: "error",
  message: "Das Stundengehalt konnte nicht gespeichert werden. Bitte versuche es erneut.",
};

const PERMISSION_ERROR: SetHourlyWageResult = {
  status: "error",
  message: "Du hast keine Berechtigung, das Stundengehalt zu ändern.",
};

const MAX_HOURLY_WAGE = 500;

export async function setEmployeeHourlyWage(input: {
  profileId: string;
  hourlyWage: string;
}): Promise<SetHourlyWageResult> {
  const result = await getCurrentUserProfile();
  if (result.status !== "ok" || result.profile.role !== "admin") {
    return PERMISSION_ERROR;
  }

  if (typeof input.profileId !== "string" || !input.profileId) {
    return GENERIC_ERROR;
  }

  let hourlyWage: number | null = null;
  if (input.hourlyWage.trim() !== "") {
    const parsed = Number(input.hourlyWage);
    if (!Number.isFinite(parsed) || parsed < 0 || parsed > MAX_HOURLY_WAGE) {
      return {
        status: "error",
        message: `Stundengehalt muss zwischen 0 und ${MAX_HOURLY_WAGE} liegen.`,
      };
    }
    hourlyWage = parsed;
  }

  const supabase = await createClient();

  const { data: employee, error: employeeError } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", input.profileId)
    .maybeSingle();

  if (employeeError || !employee) {
    return GENERIC_ERROR;
  }

  const { error } = await supabase
    .from("employee_compensation")
    .upsert({ profile_id: input.profileId, hourly_wage: hourlyWage }, { onConflict: "profile_id" });

  if (error) {
    return GENERIC_ERROR;
  }

  revalidatePath("/app/admin/mitarbeiter");

  return { status: "ok" };
}
