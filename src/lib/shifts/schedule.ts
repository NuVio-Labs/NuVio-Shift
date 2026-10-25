import { getDaysOfMonth, getIsoWeekday, toISODate, type CalendarDate } from "@/lib/shifts/dates";
import type { ShiftEntry, ShiftTemplate } from "@/lib/shifts/queries";
import { durationHours } from "@/lib/shifts/time";

/**
 * One slot in the schedule. Either
 * - a template slot on a date (`templateId` set) — `shiftId` is null while
 *   nobody has ever been assigned, i.e. no row exists yet, or
 * - a concrete shift row without a matching active template (a one-off
 *   shift, or a row whose template was deactivated/moved later).
 */
export type ScheduleSlot = {
  key: string;
  shiftId: string | null;
  templateId: string | null;
  /** True for one-off shifts — those can be deleted, template slots can't. */
  isOneOff: boolean;
  label: string;
  startTime: string;
  endTime: string;
  employeeId: string | null;
  employeeName: string | null;
};

export type DaySchedule = {
  date: CalendarDate;
  iso: string;
  slots: ScheduleSlot[];
};

function shiftToSlot(shift: ShiftEntry): ScheduleSlot {
  return {
    key: `shift:${shift.id}`,
    shiftId: shift.id,
    templateId: shift.templateId,
    isOneOff: shift.templateId === null,
    label: shift.label,
    startTime: shift.startTime,
    endTime: shift.endTime,
    employeeId: shift.employeeId,
    employeeName: shift.employeeName,
  };
}

/**
 * Combines the month's calendar, the company's active templates and the
 * existing shift rows. Only days that have at least one slot are returned,
 * so a Saturday-only company still sees just its Saturdays, while a
 * household with "Dienstag 09–12" sees its Tuesdays.
 */
export function buildMonthSchedule(
  year: number,
  month: number,
  shifts: ShiftEntry[],
  templates: ShiftTemplate[],
): DaySchedule[] {
  const shiftsByDate = new Map<string, ShiftEntry[]>();
  for (const shift of shifts) {
    const list = shiftsByDate.get(shift.iso) ?? [];
    list.push(shift);
    shiftsByDate.set(shift.iso, list);
  }

  const days: DaySchedule[] = [];

  for (const date of getDaysOfMonth(year, month)) {
    const iso = toISODate(date);
    const weekday = getIsoWeekday(date);
    const dayShifts = shiftsByDate.get(iso) ?? [];
    const usedShiftIds = new Set<string>();
    const slots: ScheduleSlot[] = [];

    for (const template of templates) {
      if (!template.active || template.weekday !== weekday) continue;

      const row = dayShifts.find((shift) => shift.templateId === template.id);
      if (row) {
        usedShiftIds.add(row.id);
        slots.push(shiftToSlot(row));
      } else {
        slots.push({
          key: `template:${template.id}:${iso}`,
          shiftId: null,
          templateId: template.id,
          isOneOff: false,
          label: template.label,
          startTime: template.startTime,
          endTime: template.endTime,
          employeeId: null,
          employeeName: null,
        });
      }
    }

    for (const shift of dayShifts) {
      if (!usedShiftIds.has(shift.id)) {
        slots.push(shiftToSlot(shift));
      }
    }

    if (slots.length === 0) continue;

    slots.sort(
      (a, b) => a.startTime.localeCompare(b.startTime) || a.label.localeCompare(b.label, "de"),
    );
    days.push({ date, iso, slots });
  }

  return days;
}

export type EmployeeMonthlyTotal = {
  employeeId: string;
  employeeName: string;
  shiftCount: number;
  plannedHours: number;
};

/**
 * Aggregates a month's shifts per assigned employee — shift count and
 * planned hours (from each shift's own start/end, not clocked time). Used
 * for the Admin monthly overview; open shifts contribute nothing.
 */
export function buildMonthlyEmployeeTotals(shifts: ShiftEntry[]): EmployeeMonthlyTotal[] {
  const totals = new Map<string, EmployeeMonthlyTotal>();

  for (const shift of shifts) {
    if (!shift.employeeId || !shift.employeeName) continue;

    const existing = totals.get(shift.employeeId) ?? {
      employeeId: shift.employeeId,
      employeeName: shift.employeeName,
      shiftCount: 0,
      plannedHours: 0,
    };

    existing.shiftCount += 1;
    existing.plannedHours += durationHours(shift.startTime, shift.endTime);
    totals.set(shift.employeeId, existing);
  }

  return [...totals.values()].sort((a, b) => a.employeeName.localeCompare(b.employeeName, "de"));
}
