import { getSaturdaysOfMonth, toISODate, type CalendarDate } from "@/lib/shifts/dates";
import { SHIFT_CONFIG } from "@/lib/shifts/config";
import type { ShiftAssignment, ShiftsByDate } from "@/lib/shifts/queries";
import type { ShiftType } from "@/types/domain";

export type SaturdaySchedule = {
  date: CalendarDate;
  iso: string;
  early?: ShiftAssignment;
  late?: ShiftAssignment;
};

/**
 * Combines every Saturday of the month with whatever shift rows exist for
 * it. A Saturday with no database row yet still appears, just with both
 * shifts undefined — the schedule is defined by the calendar, not by which
 * rows happen to exist.
 */
export function buildMonthSchedule(
  year: number,
  month: number,
  shiftsByDate: ShiftsByDate,
): SaturdaySchedule[] {
  return getSaturdaysOfMonth(year, month).map((date) => {
    const iso = toISODate(date);
    const shifts = shiftsByDate.get(iso);
    return { date, iso, early: shifts?.early, late: shifts?.late };
  });
}

export type EmployeeMonthlyTotal = {
  employeeId: string;
  employeeName: string;
  shiftCount: number;
  plannedHours: number;
};

const SHIFT_TYPES: ShiftType[] = ["early", "late"];

/**
 * Aggregates a month's shifts per assigned employee — shift count and
 * planned hours (from `SHIFT_CONFIG`, not clocked/verified time). Used for
 * the Admin monthly overview; unassigned slots simply contribute nothing.
 */
export function buildMonthlyEmployeeTotals(shiftsByDate: ShiftsByDate): EmployeeMonthlyTotal[] {
  const totals = new Map<string, EmployeeMonthlyTotal>();

  for (const dayShifts of shiftsByDate.values()) {
    for (const shiftType of SHIFT_TYPES) {
      const assignment: ShiftAssignment | undefined = dayShifts[shiftType];
      if (!assignment?.employeeId || !assignment.employeeName) continue;

      const existing = totals.get(assignment.employeeId) ?? {
        employeeId: assignment.employeeId,
        employeeName: assignment.employeeName,
        shiftCount: 0,
        plannedHours: 0,
      };

      existing.shiftCount += 1;
      existing.plannedHours += SHIFT_CONFIG[shiftType].durationHours;
      totals.set(assignment.employeeId, existing);
    }
  }

  return [...totals.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName, "de"));
}
