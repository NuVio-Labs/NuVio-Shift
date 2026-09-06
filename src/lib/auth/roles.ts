import type { UserRole } from "@/types/domain";

export const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Admin",
  scheduler: "Dienstplan-Beauftragter",
  employee: "Mitarbeiter",
};
