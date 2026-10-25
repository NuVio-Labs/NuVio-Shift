import { formatGermanWeekdayDate } from "@/lib/shifts/dates";
import type { ShiftEntry } from "@/lib/shifts/queries";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "cn";

export function MyShiftCard({
  shift,
  highlighted = false,
}: {
  shift: ShiftEntry;
  highlighted?: boolean;
}) {
  return (
    <Card className={cn(highlighted && "ring-2 ring-primary/50")}>
      <CardContent className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">{formatGermanWeekdayDate(shift.date)}</p>
        <p className="text-base font-medium text-foreground">{shift.label}</p>
        <p className="text-sm text-muted-foreground">
          {shift.startTime}–{shift.endTime}
        </p>
      </CardContent>
    </Card>
  );
}
