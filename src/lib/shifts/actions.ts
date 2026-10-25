"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import {
  formatGermanWeekdayDayMonth,
  getIsoWeekday,
  parseISODate,
  type CalendarDate,
} from "@/lib/shifts/dates";
import { normalizeTime, validateShiftTimes } from "@/lib/shifts/time";
import { sendPushToUser } from "@/lib/push/internal";

export type ShiftMutationResult =
  | { status: "ok" }
  | { status: "error"; message: string };

const GENERIC_ERROR: ShiftMutationResult = {
  status: "error",
  message: "Die Schicht konnte nicht gespeichert werden. Bitte versuche es erneut.",
};

const PERMISSION_ERROR: ShiftMutationResult = {
  status: "error",
  message: "Du hast keine Berechtigung, den Dienstplan zu bearbeiten.",
};

const EMPLOYEE_NOT_ASSIGNABLE_ERROR: ShiftMutationResult = {
  status: "error",
  message: "Dieser Mitarbeiter kann nicht eingeplant werden.",
};

const NOT_FOUND_ERROR: ShiftMutationResult = {
  status: "error",
  message: "Diese Schicht gibt es nicht mehr. Bitte lade die Seite neu.",
};

const UNIQUE_VIOLATION = "23505";

/**
 * Re-checks the role server-side on every call — the client is never the
 * source of truth for "I am a scheduler". `admin` intentionally does not
 * pass here: schedule editing stays scheduler-only, RLS enforces the same
 * rule at the database level as a second, independent layer.
 */
async function requireActiveScheduler() {
  const result = await getCurrentUserProfile();
  if (result.status !== "ok" || result.profile.role !== "scheduler") {
    return null;
  }
  return result.profile;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Active employee/scheduler of the caller's company (RLS scopes the read). */
async function isAssignableEmployee(supabase: Supabase, employeeId: unknown): Promise<boolean> {
  if (!isNonEmptyString(employeeId)) return false;

  const { data, error } = await supabase
    .from("profiles")
    .select("id, active, role")
    .eq("id", employeeId)
    .maybeSingle();

  if (error || !data) return false;
  return data.active && (data.role === "employee" || data.role === "scheduler");
}

type ShiftInfo = {
  date: CalendarDate;
  startTime: string;
  endTime: string;
  label: string;
};

type ShiftNotificationKind = "assigned" | "removed";

function buildShiftNotificationPayload(shift: ShiftInfo, kind: ShiftNotificationKind) {
  const description = `${formatGermanWeekdayDayMonth(shift.date)} · ${shift.startTime}–${shift.endTime} · ${shift.label}`;

  return {
    title: "NuVio Shift",
    body: kind === "assigned" ? `Neue Schicht: ${description}` : `Schicht entfernt: ${description}`,
    url: "/app/meine-schichten",
  };
}

/**
 * Notifies whoever is losing/gaining a shift. Strictly best-effort: one
 * recipient's failure never affects the other or the (already-committed)
 * shift mutation.
 */
async function notifyShiftChange(
  previousEmployeeId: string | null,
  newEmployeeId: string | null,
  shift: ShiftInfo,
): Promise<void> {
  if (previousEmployeeId === newEmployeeId) {
    return; // same employee re-saved — no actual change, no push
  }

  const notifications: Promise<void>[] = [];

  if (previousEmployeeId) {
    notifications.push(
      sendPushToUser(previousEmployeeId, buildShiftNotificationPayload(shift, "removed")).catch(
        (err: unknown) => console.error("Failed to send 'Schicht entfernt' push:", err),
      ),
    );
  }

  if (newEmployeeId) {
    notifications.push(
      sendPushToUser(newEmployeeId, buildShiftNotificationPayload(shift, "assigned")).catch(
        (err: unknown) => console.error("Failed to send 'Neue Schicht' push:", err),
      ),
    );
  }

  await Promise.all(notifications);
}

function revalidateSchedule() {
  revalidatePath("/app/dienstplan");
  revalidatePath("/app/meine-schichten");
}

type ExistingShift = {
  id: string;
  shiftDate: string;
  date: CalendarDate;
  startTime: string;
  endTime: string;
  label: string;
  templateId: string | null;
  employeeId: string | null;
};

async function loadShift(supabase: Supabase, shiftId: unknown): Promise<ExistingShift | null> {
  if (!isNonEmptyString(shiftId)) return null;

  const { data, error } = await supabase
    .from("shifts")
    .select("id, shift_date, start_time, end_time, label, template_id, employee_id")
    .eq("id", shiftId)
    .maybeSingle();

  if (error || !data) return null;

  const date = parseISODate(data.shift_date);
  const startTime = normalizeTime(data.start_time);
  const endTime = normalizeTime(data.end_time);
  if (!date || !startTime || !endTime) return null;

  return {
    id: data.id,
    shiftDate: data.shift_date,
    date,
    startTime,
    endTime,
    label: data.label,
    templateId: data.template_id,
    employeeId: data.employee_id,
  };
}

/**
 * Assigns an employee to a template slot on one date. Creates the shift row
 * on first assignment (copying the template's times and label), updates it
 * afterwards. The date and template always come from the server-side
 * template lookup, never from client-supplied times.
 */
export async function assignEmployeeToTemplateSlot(input: {
  shiftDate: string;
  templateId: string;
  employeeId: string;
}): Promise<ShiftMutationResult> {
  const scheduler = await requireActiveScheduler();
  if (!scheduler) return PERMISSION_ERROR;

  const date = typeof input.shiftDate === "string" ? parseISODate(input.shiftDate) : null;
  if (!date || !isNonEmptyString(input.templateId)) return GENERIC_ERROR;

  const supabase = await createClient();

  const { data: template, error: templateError } = await supabase
    .from("shift_templates")
    .select("id, label, weekday, start_time, end_time, active")
    .eq("id", input.templateId)
    .maybeSingle();

  if (templateError || !template || !template.active || template.weekday !== getIsoWeekday(date)) {
    return NOT_FOUND_ERROR;
  }

  const startTime = normalizeTime(template.start_time);
  const endTime = normalizeTime(template.end_time);
  if (!startTime || !endTime) return GENERIC_ERROR;

  if (!(await isAssignableEmployee(supabase, input.employeeId))) {
    return EMPLOYEE_NOT_ASSIGNABLE_ERROR;
  }

  const findExisting = () =>
    supabase
      .from("shifts")
      .select("id, employee_id, start_time, end_time, label")
      .eq("shift_date", input.shiftDate)
      .eq("template_id", template.id)
      .maybeSingle();

  let { data: existing } = await findExisting();

  if (!existing) {
    const { error } = await supabase.from("shifts").insert({
      company_id: scheduler.companyId,
      shift_date: input.shiftDate,
      template_id: template.id,
      start_time: startTime,
      end_time: endTime,
      label: template.label,
      employee_id: input.employeeId,
    });

    if (!error) {
      revalidateSchedule();
      await notifyShiftChange(null, input.employeeId, { date, startTime, endTime, label: template.label });
      return { status: "ok" };
    }

    // Another scheduler created the row in the meantime — fall through and
    // update it instead. Any other error is a real failure.
    if (error.code !== UNIQUE_VIOLATION) return GENERIC_ERROR;

    ({ data: existing } = await findExisting());
    if (!existing) return GENERIC_ERROR;
  }

  const { error } = await supabase
    .from("shifts")
    .update({ employee_id: input.employeeId })
    .eq("id", existing.id);

  if (error) return GENERIC_ERROR;

  revalidateSchedule();
  await notifyShiftChange(existing.employee_id, input.employeeId, {
    date,
    startTime: normalizeTime(existing.start_time) ?? startTime,
    endTime: normalizeTime(existing.end_time) ?? endTime,
    label: existing.label,
  });

  return { status: "ok" };
}

/** Assigns or changes the employee of an existing shift row. */
export async function assignEmployeeToShift(input: {
  shiftId: string;
  employeeId: string;
}): Promise<ShiftMutationResult> {
  if (!(await requireActiveScheduler())) return PERMISSION_ERROR;

  const supabase = await createClient();
  const shift = await loadShift(supabase, input.shiftId);
  if (!shift) return NOT_FOUND_ERROR;

  if (!(await isAssignableEmployee(supabase, input.employeeId))) {
    return EMPLOYEE_NOT_ASSIGNABLE_ERROR;
  }

  const { error } = await supabase
    .from("shifts")
    .update({ employee_id: input.employeeId })
    .eq("id", shift.id);

  if (error) return GENERIC_ERROR;

  revalidateSchedule();
  await notifyShiftChange(shift.employeeId, input.employeeId, shift);

  return { status: "ok" };
}

/**
 * Clears the employee of a shift — the shift stays as "Nicht besetzt".
 * Works for template slots and one-off shifts alike.
 */
export async function removeEmployeeFromShift(input: {
  shiftId: string;
}): Promise<ShiftMutationResult> {
  if (!(await requireActiveScheduler())) return PERMISSION_ERROR;

  const supabase = await createClient();
  const shift = await loadShift(supabase, input.shiftId);
  if (!shift) return NOT_FOUND_ERROR;

  const { error } = await supabase.from("shifts").update({ employee_id: null }).eq("id", shift.id);

  if (error) return GENERIC_ERROR;

  revalidateSchedule();
  await notifyShiftChange(shift.employeeId, null, shift);

  return { status: "ok" };
}

/**
 * Creates a one-off shift on any date with its own times and label,
 * optionally assigned right away (`employeeId` null = open shift).
 */
export async function createShift(input: {
  shiftDate: string;
  startTime: string;
  endTime: string;
  label: string;
  employeeId: string | null;
}): Promise<ShiftMutationResult> {
  const scheduler = await requireActiveScheduler();
  if (!scheduler) return PERMISSION_ERROR;

  const date = typeof input.shiftDate === "string" ? parseISODate(input.shiftDate) : null;
  if (!date) {
    return { status: "error", message: "Bitte gib ein gültiges Datum an." };
  }

  const times = validateShiftTimes(input, "Schicht");
  if (times.status === "error") return times;

  const supabase = await createClient();

  const employeeId = input.employeeId || null;
  if (employeeId && !(await isAssignableEmployee(supabase, employeeId))) {
    return EMPLOYEE_NOT_ASSIGNABLE_ERROR;
  }

  const { error } = await supabase.from("shifts").insert({
    company_id: scheduler.companyId,
    shift_date: input.shiftDate,
    start_time: times.value.startTime,
    end_time: times.value.endTime,
    label: times.value.label,
    employee_id: employeeId,
  });

  if (error) return GENERIC_ERROR;

  revalidateSchedule();
  await notifyShiftChange(null, employeeId, { date, ...times.value });

  return { status: "ok" };
}

/**
 * Deletes a one-off shift entirely. Template slots can't be deleted — they
 * come back from the template; use "Zuweisung entfernen" or deactivate the
 * template instead.
 */
export async function deleteShift(input: { shiftId: string }): Promise<ShiftMutationResult> {
  if (!(await requireActiveScheduler())) return PERMISSION_ERROR;

  const supabase = await createClient();
  const shift = await loadShift(supabase, input.shiftId);
  if (!shift) return NOT_FOUND_ERROR;

  if (shift.templateId !== null) {
    return {
      status: "error",
      message: "Wiederkehrende Schichten kommen aus einer Vorlage und können hier nicht gelöscht werden.",
    };
  }

  const { error } = await supabase.from("shifts").delete().eq("id", shift.id);
  if (error) return GENERIC_ERROR;

  revalidateSchedule();
  await notifyShiftChange(shift.employeeId, null, shift);

  return { status: "ok" };
}
