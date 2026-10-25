/**
 * Wall-clock times of day as `HH:MM` strings — no date, no timezone.
 * Postgres `time` columns come back as `HH:MM:SS`; everything in the app
 * works with the normalized `HH:MM` form produced by `normalizeTime()`.
 */

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)(?::[0-5]\d)?$/;

/** `08:00:00` / `08:00` → `08:00`; anything else → null. Safe for untrusted input. */
export function normalizeTime(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const match = TIME_PATTERN.exec(value.trim());
  return match ? `${match[1]}:${match[2]}` : null;
}

/** Minutes since midnight for a normalized `HH:MM` time. */
export function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/** Duration in hours between two `HH:MM` times on the same day (end > start). */
export function durationHours(start: string, end: string): number {
  return (timeToMinutes(end) - timeToMinutes(start)) / 60;
}

/** `3,5` — German number formatting for hour totals, no trailing zeros. */
export function formatHours(hours: number): string {
  return hours.toLocaleString("de-DE", { maximumFractionDigits: 2 });
}

export type ShiftTimesInput = {
  startTime: unknown;
  endTime: unknown;
  label: unknown;
};

export type ValidShiftTimes = { startTime: string; endTime: string; label: string };

export const MAX_LABEL_LENGTH = 40;

/**
 * Validates start/end/label from untrusted client input. Mirrors the
 * database checks (end > start, label 1–40 chars) so the user gets a clear
 * German message instead of a generic save error.
 */
export function validateShiftTimes(
  input: ShiftTimesInput,
  fallbackLabel?: string,
): { status: "ok"; value: ValidShiftTimes } | { status: "error"; message: string } {
  const startTime = normalizeTime(input.startTime);
  const endTime = normalizeTime(input.endTime);

  if (!startTime || !endTime) {
    return { status: "error", message: "Bitte gib eine gültige Start- und Endzeit an." };
  }

  if (timeToMinutes(endTime) <= timeToMinutes(startTime)) {
    return {
      status: "error",
      message: "Die Endzeit muss nach der Startzeit liegen. Schichten über Mitternacht sind noch nicht möglich.",
    };
  }

  const rawLabel = typeof input.label === "string" ? input.label.trim() : "";
  const label = rawLabel || fallbackLabel || "";

  if (!label) {
    return { status: "error", message: "Bitte gib eine Bezeichnung an." };
  }

  if (label.length > MAX_LABEL_LENGTH) {
    return {
      status: "error",
      message: `Die Bezeichnung darf höchstens ${MAX_LABEL_LENGTH} Zeichen lang sein.`,
    };
  }

  return { status: "ok", value: { startTime, endTime, label } };
}
