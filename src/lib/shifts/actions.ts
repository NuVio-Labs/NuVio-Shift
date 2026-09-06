"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { isSaturday, parseISODate } from "@/lib/shifts/dates";
import type { ShiftType } from "@/types/domain";

export type ShiftMutationResult =
  | { status: "ok" }
  | { status: "error"; message: string };

const GENERIC_ERROR: ShiftMutationResult = {
  status: "error",
  message: "Die Zuweisung konnte nicht gespeichert werden. Bitte versuche es erneut.",
};

const PERMISSION_ERROR: ShiftMutationResult = {
  status: "error",
  message: "Du hast keine Berechtigung, den Dienstplan zu bearbeiten.",
};

const EMPLOYEE_NOT_ASSIGNABLE_ERROR: ShiftMutationResult = {
  status: "error",
  message: "Dieser Mitarbeiter kann nicht eingeplant werden.",
};

function isValidShiftType(value: unknown): value is ShiftType {
  return value === "early" || value === "late";
}

/**
 * Re-checks the role server-side on every call — the client is never the
 * source of truth for "I am a scheduler". `admin` intentionally does not
 * pass here: Scope 1 keeps schedule editing scheduler-only, RLS enforces
 * the same rule at the database level as a second, independent layer.
 */
async function requireActiveScheduler() {
  const result = await getCurrentUserProfile();
  if (result.status !== "ok" || result.profile.role !== "scheduler") {
    return null;
  }
  return result.profile;
}

/** Validates a shift slot identifier that came from untrusted client input. */
function validateShiftSlot(shiftDate: unknown, shiftType: unknown) {
  if (typeof shiftDate !== "string" || !isValidShiftType(shiftType)) {
    return null;
  }

  const date = parseISODate(shiftDate);
  if (!date || !isSaturday(date)) {
    return null;
  }

  return { shiftDate, shiftType };
}

export async function assignEmployeeToShift(input: {
  shiftDate: string;
  shiftType: ShiftType;
  employeeId: string;
}): Promise<ShiftMutationResult> {
  if (!(await requireActiveScheduler())) {
    return PERMISSION_ERROR;
  }

  const slot = validateShiftSlot(input.shiftDate, input.shiftType);
  if (!slot) {
    return GENERIC_ERROR;
  }

  if (typeof input.employeeId !== "string" || !input.employeeId) {
    return EMPLOYEE_NOT_ASSIGNABLE_ERROR;
  }

  const supabase = await createClient();

  const { data: employee, error: employeeError } = await supabase
    .from("profiles")
    .select("id, active, role")
    .eq("id", input.employeeId)
    .maybeSingle();

  if (employeeError || !employee) {
    return EMPLOYEE_NOT_ASSIGNABLE_ERROR;
  }

  if (!employee.active || (employee.role !== "employee" && employee.role !== "scheduler")) {
    return EMPLOYEE_NOT_ASSIGNABLE_ERROR;
  }

  // Upsert on the (shift_date, shift_type) unique constraint: creates the
  // row on first assignment, updates it if one already exists — one
  // statement, no read-then-write race between concurrent schedulers.
  const { error } = await supabase.from("shifts").upsert(
    {
      shift_date: slot.shiftDate,
      shift_type: slot.shiftType,
      employee_id: input.employeeId,
    },
    { onConflict: "shift_date,shift_type" },
  );

  if (error) {
    return GENERIC_ERROR;
  }

  revalidatePath("/app/dienstplan");
  return { status: "ok" };
}

export async function removeEmployeeFromShift(input: {
  shiftDate: string;
  shiftType: ShiftType;
}): Promise<ShiftMutationResult> {
  if (!(await requireActiveScheduler())) {
    return PERMISSION_ERROR;
  }

  const slot = validateShiftSlot(input.shiftDate, input.shiftType);
  if (!slot) {
    return GENERIC_ERROR;
  }

  const supabase = await createClient();

  // Never DELETE the row — clearing employee_id keeps the slot as "Nicht
  // besetzt". If no row exists yet, this simply matches zero rows.
  const { error } = await supabase
    .from("shifts")
    .update({ employee_id: null })
    .eq("shift_date", slot.shiftDate)
    .eq("shift_type", slot.shiftType);

  if (error) {
    return GENERIC_ERROR;
  }

  revalidatePath("/app/dienstplan");
  return { status: "ok" };
}
