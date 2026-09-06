import { formatGermanDate } from "@/lib/shifts/dates";
import { SHIFT_CONFIG } from "@/lib/shifts/config";
import type { MyShift } from "@/lib/shifts/queries";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";

export function MyShiftCard({
  shift,
  highlighted = false,
}: {
  shift: MyShift;
  highlighted?: boolean;
}) {
  const config = SHIFT_CONFIG[shift.shiftType];

  return (
    <Card className={cn(highlighted && "ring-2 ring-primary/50")}>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">
          Samstag, {formatGermanDate(shift.date)}
        </p>
        <p className="text-base font-medium text-foreground">{config.label}</p>
        <p className="text-sm text-muted-foreground">
          {config.start}–{config.end}
        </p>
      </CardContent>
    </Card>
  );
}
