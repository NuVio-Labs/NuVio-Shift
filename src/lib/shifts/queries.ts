import { createClient } from "@/lib/supabase/server";
import {
  getMonthDateRange,
  getToday,
  parseISODate,
  toISODate,
  type CalendarDate,
} from "@/lib/shifts/dates";
import type { ShiftType, UserRole } from "@/types/domain";

export type ShiftAssignment = {
  id: string;
  employeeId: string | null;
  employeeName: string | null;
};

/** Keyed by ISO `shift_date`. A missing entry means "no row for that day yet". */
export type ShiftsByDate = Map<string, Partial<Record<ShiftType, ShiftAssignment>>>;

export type GetShiftsForMonthResult =
  | { status: "ok"; shiftsByDate: ShiftsByDate }
  | { status: "error" };

type ShiftRow = {
  id: string;
  shift_date: string;
  shift_type: ShiftType;
  employee_id: string | null;
  employee: { id: string; name: string } | null;
};

/**
 * Loads shifts for one calendar month, filtered server-side by date range.
 * Saturdays without a matching row simply don't appear in the returned
 * map — the UI treats that as "Nicht besetzt" rather than requiring a
 * database row to exist upfront.
 */
export async function getShiftsForMonth(
  year: number,
  month: number,
): Promise<GetShiftsForMonthResult> {
  const supabase = await createClient();
  const { start, end } = getMonthDateRange(year, month);

  const { data, error } = await supabase
    .from("shifts")
    .select("id, shift_date, shift_type, employee_id, employee:profiles(id, name)")
    .gte("shift_date", start)
    .lt("shift_date", end)
    .returns<ShiftRow[]>();

  if (error) {
    return { status: "error" };
  }

  const shiftsByDate: ShiftsByDate = new Map();

  for (const row of data) {
    const dateEntry = shiftsByDate.get(row.shift_date) ?? {};
    dateEntry[row.shift_type] = {
      id: row.id,
      employeeId: row.employee_id,
      employeeName: row.employee?.name ?? null,
    };
    shiftsByDate.set(row.shift_date, dateEntry);
  }

  return { status: "ok", shiftsByDate };
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
 * and stays assignable; `admin` is management-only and never a car-wash
 * employee in Scope 1.
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

export type MyShift = {
  id: string;
  date: CalendarDate;
  iso: string;
  shiftType: ShiftType;
};

export type GetMyShiftsResult =
  | { status: "ok"; shifts: MyShift[] }
  | { status: "unauthenticated" }
  | { status: "error" };

const SHIFT_TYPE_ORDER: Record<ShiftType, number> = { early: 0, late: 1 };

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
    .select("id, shift_date, shift_type")
    .eq("employee_id", userId)
    .gte("shift_date", toISODate(getToday()))
    .returns<{ id: string; shift_date: string; shift_type: ShiftType }[]>();

  if (error) {
    return { status: "error" };
  }

  const shifts: MyShift[] = data
    .map((row) => {
      const date = parseISODate(row.shift_date);
      return date ? { id: row.id, date, iso: row.shift_date, shiftType: row.shift_type } : null;
    })
    .filter((shift): shift is MyShift => shift !== null)
    .sort(
      (a, b) =>
        a.iso.localeCompare(b.iso) || SHIFT_TYPE_ORDER[a.shiftType] - SHIFT_TYPE_ORDER[b.shiftType],
    );

  return { status: "ok", shifts };
}
