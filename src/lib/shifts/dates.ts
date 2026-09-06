const SATURDAY = 6; // Date#getUTCDay(): Sunday = 0 … Saturday = 6

const GERMAN_MONTH_NAMES = [
  "Januar",
  "Februar",
  "März",
  "April",
  "Mai",
  "Juni",
  "Juli",
  "August",
  "September",
  "Oktober",
  "November",
  "Dezember",
];

/**
 * A pure calendar date — no time, no timezone. `month` is 1-based
 * (1 = Januar … 12 = Dezember) to match ISO dates and the `shifts.shift_date`
 * column, unlike JS `Date`'s 0-based month.
 *
 * All arithmetic below goes through `Date.UTC` purely as a calendar
 * calculator (weekday-of-date, days-in-month) — never to represent a real
 * instant in time — so results never drift with the server's local
 * timezone.
 */
export type CalendarDate = {
  year: number;
  month: number;
  day: number;
};

function daysInMonth(year: number, month: number): number {
  // Day 0 of `month` (1-based, i.e. the 0-based index of the *next* month)
  // is the last day of the target month.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** True if the given calendar date falls on a Saturday. */
export function isSaturday({ year, month, day }: CalendarDate): boolean {
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() === SATURDAY;
}

/**
 * Parses a `YYYY-MM-DD` string into a `CalendarDate`, rejecting malformed
 * input and impossible calendar days (e.g. `2026-02-30`). Used to validate
 * untrusted input to server actions — never trust a date string from the
 * client without re-checking it here.
 */
export function parseISODate(iso: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  if (month < 1 || month > 12) return null;
  if (day < 1 || day > daysInMonth(year, month)) return null;

  return { year, month, day };
}

/** Every Saturday of the given month, in ascending order. */
export function getSaturdaysOfMonth(year: number, month: number): CalendarDate[] {
  const total = daysInMonth(year, month);
  const saturdays: CalendarDate[] = [];

  for (let day = 1; day <= total; day++) {
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    if (weekday === SATURDAY) {
      saturdays.push({ year, month, day });
    }
  }

  return saturdays;
}

function pad(value: number, length: number): string {
  return value.toString().padStart(length, "0");
}

/** `2026-09-05` — matches the `shifts.shift_date` column format. */
export function toISODate({ year, month, day }: CalendarDate): string {
  return `${pad(year, 4)}-${pad(month, 2)}-${pad(day, 2)}`;
}

/** `05.09.2026` */
export function formatGermanDate({ year, month, day }: CalendarDate): string {
  return `${pad(day, 2)}.${pad(month, 2)}.${year}`;
}

/** `05.09.` — for contexts where month/year is already shown elsewhere. */
export function formatGermanDayMonth({ day, month }: CalendarDate): string {
  return `${pad(day, 2)}.${pad(month, 2)}.`;
}

/** `September 2026` */
export function getGermanMonthLabel(year: number, month: number): string {
  return `${GERMAN_MONTH_NAMES[month - 1]} ${year}`;
}

/** Half-open `[start, end)` ISO date range covering the given month. */
export function getMonthDateRange(
  year: number,
  month: number,
): { start: string; end: string } {
  const next = getAdjacentMonth(year, month, 1);
  return {
    start: toISODate({ year, month, day: 1 }),
    end: toISODate({ year: next.year, month: next.month, day: 1 }),
  };
}

export function getAdjacentMonth(
  year: number,
  month: number,
  direction: -1 | 1,
): { year: number; month: number } {
  const total = month + direction;
  if (total < 1) return { year: year - 1, month: 12 };
  if (total > 12) return { year: year + 1, month: 1 };
  return { year, month: total };
}

/** Today, as the server's local calendar date. */
export function getToday(): CalendarDate {
  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

/**
 * Parses `year`/`month` search params, falling back to the server's
 * current month for anything missing or out of range (no runtime errors
 * on `month=99` or `year=abc`).
 */
export function normalizeYearMonth(
  yearParam: string | undefined,
  monthParam: string | undefined,
): { year: number; month: number } {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;

  const year = Number.parseInt(yearParam ?? "", 10);
  const month = Number.parseInt(monthParam ?? "", 10);

  const validYear = Number.isInteger(year) && year >= 2000 && year <= 2100;
  const validMonth = Number.isInteger(month) && month >= 1 && month <= 12;

  return {
    year: validYear ? year : currentYear,
    month: validMonth ? month : currentMonth,
  };
}
