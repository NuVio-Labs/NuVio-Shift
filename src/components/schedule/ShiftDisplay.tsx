import { SHIFT_CONFIG } from "@/lib/shifts/config";
import type { ShiftAssignment } from "@/lib/shifts/queries";
import type { ShiftType } from "@/types/domain";
import { cn } from "cn";

export function ShiftDisplay({
  shiftType,
  assignment,
  showLabel = true,
}: {
  shiftType: ShiftType;
  assignment?: ShiftAssignment;
  showLabel?: boolean;
}) {
  const config = SHIFT_CONFIG[shiftType];
  const employeeName = assignment?.employeeName;

  return (
    <div className="flex flex-col gap-0.5">
      {showLabel && (
        <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
          {config.label}
        </p>
      )}
      <p className="text-sm text-muted-foreground">
        {config.start}–{config.end}
      </p>
      <p
        className={cn(
          "text-sm",
          employeeName ? "font-medium text-foreground" : "text-muted-foreground italic",
        )}
      >
        {employeeName ?? "Nicht besetzt"}
      </p>
    </div>
  );
}
