import { createClient } from "@/lib/supabase/server";
import {
  getMonthDateRange,
  getToday,
  isIsoWeekday,
  parseISODate,
  toISODate,
  type CalendarDate,
} from "@/lib/shifts/dates";
import { normalizeTime } from "@/lib/shifts/time";
import type { IsoWeekday, UserRole } from "@/types/domain";

/** A concrete shift row, with times normalized to `HH:MM`. */
export type ShiftEntry = {
  id: string;
  iso: string;
  date: CalendarDate;
  startTime: string;
  endTime: string;
  label: string;
  templateId: string | null;
  employeeId: string | null;
  employeeName: string | null;
};

type ShiftRow = {
  id: string;
  shift_date: string;
  start_time: string;
  end_time: string;
  label: string;
  template_id: string | null;
  employee_id: string | null;
  employee: { id: string; name: string } | null;
};

const SHIFT_SELECT =
  "id, shift_date, start_time, end_time, label, template_id, employee_id, employee:profiles(id, name)";

function toShiftEntry(row: ShiftRow): ShiftEntry | null {
  const date = parseISODate(row.shift_date);
  const startTime = normalizeTime(row.start_time);
  const endTime = normalizeTime(row.end_time);
  if (!date || !startTime || !endTime) return null;

  return {
    id: row.id,
    iso: row.shift_date,
    date,
    startTime,
    endTime,
    label: row.label,
    templateId: row.template_id,
    employeeId: row.employee_id,
    employeeName: row.employee?.name ?? null,
  };
}

function compareShifts(a: ShiftEntry, b: ShiftEntry): number {
  return (
    a.iso.localeCompare(b.iso) ||
    a.startTime.localeCompare(b.startTime) ||
    a.label.localeCompare(b.label, "de")
  );
}

export type GetShiftsForMonthResult =
  | { status: "ok"; shifts: ShiftEntry[] }
  | { status: "error" };

/**
 * Loads all shift rows of one calendar month, filtered server-side by date
 * range (RLS scopes them to the user's company). Empty template slots have
 * no row — `buildMonthSchedule()` fills those in from the templates.
 */
export async function getShiftsForMonth(
  year: number,
  month: number,
): Promise<GetShiftsForMonthResult> {
  const supabase = await createClient();
  const { start, end } = getMonthDateRange(year, month);

  const { data, error } = await supabase
    .from("shifts")
    .select(SHIFT_SELECT)
    .gte("shift_date", start)
    .lt("shift_date", end)
    .returns<ShiftRow[]>();

  if (error) {
    return { status: "error" };
  }

  const shifts = data
    .map(toShiftEntry)
    .filter((shift): shift is ShiftEntry => shift !== null)
    .sort(compareShifts);

  return { status: "ok", shifts };
}

export type ShiftTemplate = {
  id: string;
  label: string;
  weekday: IsoWeekday;
  startTime: string;
  endTime: string;
  active: boolean;
};

type ShiftTemplateRow = {
  id: string;
  label: string;
  weekday: number;
  start_time: string;
  end_time: string;
  active: boolean;
};

export type GetShiftTemplatesResult =
  | { status: "ok"; templates: ShiftTemplate[] }
  | { status: "error" };

/**
 * The company's recurring shift slots, ordered by weekday and start time.
 * RLS already limits rows to the user's own company.
 */
export async function getShiftTemplates(
  options: { includeInactive?: boolean } = {},
): Promise<GetShiftTemplatesResult> {
  const supabase = await createClient();

  let query = supabase
    .from("shift_templates")
    .select("id, label, weekday, start_time, end_time, active");

  if (!options.includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query.returns<ShiftTemplateRow[]>();

  if (error) {
    return { status: "error" };
  }

  const templates: ShiftTemplate[] = [];
  for (const row of data) {
    const startTime = normalizeTime(row.start_time);
    const endTime = normalizeTime(row.end_time);
    if (!isIsoWeekday(row.weekday) || !startTime || !endTime) continue;
    templates.push({
      id: row.id,
      label: row.label,
      weekday: row.weekday,
      startTime,
      endTime,
      active: row.active,
    });
  }

  templates.sort(
    (a, b) =>
      a.weekday - b.weekday ||
      a.startTime.localeCompare(b.startTime) ||
      a.label.localeCompare(b.label, "de"),
  );

  return { status: "ok", templates };
}

export type AssignableEmployee = {
  id: string;
  name: string;
  role: UserRole;
};

export type GetAssignableEmployeesResult =
  | { status: "ok"; employees: AssignableEmployee[] }
  | { status: "error" };

/**
 * Employees a shift can be assigned to: active profiles with role
 * `employee` or `scheduler`. A scheduler is themselves a regular worker
 * and stays assignable; `admin` is management-only.
 */
export async function getAssignableEmployees(): Promise<GetAssignableEmployeesResult> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, name, role")
    .eq("active", true)
    .in("role", ["employee", "scheduler"])
    .order("name", { ascending: true })
    .returns<AssignableEmployee[]>();

  if (error) {
    return { status: "error" };
  }

  return { status: "ok", employees: data };
}

export type GetMyShiftsResult =
  | { status: "ok"; shifts: ShiftEntry[] }
  | { status: "unauthenticated" }
  | { status: "error" };

/**
 * The current user's own upcoming shifts (today onward) — never accepts an
 * employee id from the caller. The identity comes from the authenticated
 * session (`getClaims()`), exactly like `getCurrentUserProfile()`, so there
 * is no way to pass in someone else's id.
 */
export async function getMyShifts(): Promise<GetMyShiftsResult> {
  const supabase = await createClient();

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;

  if (!userId) {
    return { status: "unauthenticated" };
  }

  const { data, error } = await supabase
    .from("shifts")
    .select(SHIFT_SELECT)
    .eq("employee_id", userId)
    .gte("shift_date", toISODate(getToday()))
    .returns<ShiftRow[]>();

  if (error) {
    return { status: "error" };
  }

  const shifts = data
    .map(toShiftEntry)
    .filter((shift): shift is ShiftEntry => shift !== null)
    .sort(compareShifts);

  return { status: "ok", shifts };
}
