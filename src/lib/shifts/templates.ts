"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { isIsoWeekday } from "@/lib/shifts/dates";
import { validateShiftTimes } from "@/lib/shifts/time";

export type TemplateMutationResult =
  | { status: "ok" }
  | { status: "error"; message: string };

const GENERIC_ERROR: TemplateMutationResult = {
  status: "error",
  message: "Die Vorlage konnte nicht gespeichert werden. Bitte versuche es erneut.",
};

const PERMISSION_ERROR: TemplateMutationResult = {
  status: "error",
  message: "Du hast keine Berechtigung, Schichtvorlagen zu bearbeiten.",
};

/** Admins and schedulers both configure templates; RLS enforces the same. */
async function requireTemplateManager() {
  const result = await getCurrentUserProfile();
  if (result.status !== "ok") return null;
  if (result.profile.role !== "admin" && result.profile.role !== "scheduler") return null;
  return result.profile;
}

function revalidateTemplates() {
  revalidatePath("/app/schichtvorlagen");
  revalidatePath("/app/dienstplan");
}

/**
 * Creates a template (no `id`) or updates an existing one. Changing a
 * template only affects empty slots — shifts that were already filled keep
 * the times and label they were created with.
 */
export async function saveShiftTemplate(input: {
  id?: string;
  label: string;
  weekday: number;
  startTime: string;
  endTime: string;
}): Promise<TemplateMutationResult> {
  const manager = await requireTemplateManager();
  if (!manager) return PERMISSION_ERROR;

  if (!isIsoWeekday(input.weekday)) {
    return { status: "error", message: "Bitte wähle einen Wochentag aus." };
  }

  const times = validateShiftTimes(input);
  if (times.status === "error") return times;

  const values = {
    label: times.value.label,
    weekday: input.weekday,
    start_time: times.value.startTime,
    end_time: times.value.endTime,
  };

  const supabase = await createClient();

  if (input.id) {
    if (typeof input.id !== "string") return GENERIC_ERROR;

    const { data, error } = await supabase
      .from("shift_templates")
      .update(values)
      .eq("id", input.id)
      .select("id");

    if (error || !data || data.length === 0) return GENERIC_ERROR;
  } else {
    const { error } = await supabase
      .from("shift_templates")
      .insert({ ...values, company_id: manager.companyId });

    if (error) return GENERIC_ERROR;
  }

  revalidateTemplates();
  return { status: "ok" };
}

/**
 * Templates are deactivated rather than deleted: past and already-filled
 * shifts keep their reference, and the slot simply stops appearing for new
 * dates.
 */
export async function setShiftTemplateActive(input: {
  id: string;
  active: boolean;
}): Promise<TemplateMutationResult> {
  if (!(await requireTemplateManager())) return PERMISSION_ERROR;

  if (typeof input.id !== "string" || !input.id || typeof input.active !== "boolean") {
    return GENERIC_ERROR;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("shift_templates")
    .update({ active: input.active })
    .eq("id", input.id)
    .select("id");

  if (error || !data || data.length === 0) return GENERIC_ERROR;

  revalidateTemplates();
  return { status: "ok" };
}
