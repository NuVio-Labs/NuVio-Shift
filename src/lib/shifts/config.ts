import type { ShiftType } from "@/types/domain";

type ShiftDefinition = {
  label: string;
  start: string;
  end: string;
  durationHours: number;
};

export const SHIFT_CONFIG = {
  early: {
    label: "Früh",
    start: "08:00",
    end: "14:00",
    durationHours: 6,
  },
  late: {
    label: "Spät",
    start: "14:00",
    end: "20:00",
    durationHours: 6,
  },
} as const satisfies Record<ShiftType, ShiftDefinition>;
