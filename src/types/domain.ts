export type UserRole = "admin" | "scheduler" | "employee";

/** ISO weekday, matches Postgres `extract(isodow ...)`: Monday = 1 … Sunday = 7. */
export type IsoWeekday = 1 | 2 | 3 | 4 | 5 | 6 | 7;
