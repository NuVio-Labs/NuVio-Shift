import { formatGermanWeekdayDayMonth } from "@/lib/shifts/dates";
import type { AssignableEmployee } from "@/lib/shifts/queries";
import type { DaySchedule } from "@/lib/shifts/schedule";
import { CreateShiftDialog } from "@/components/schedule/CreateShiftDialog";
import { ShiftAssignmentDialog } from "@/components/schedule/ShiftAssignmentDialog";
import { ShiftDisplay } from "@/components/schedule/ShiftDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export function DayCard({
  day,
  canEdit = false,
  employees = [],
}: {
  day: DaySchedule;
  canEdit?: boolean;
  employees?: AssignableEmployee[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{formatGermanWeekdayDayMonth(day.date)}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {day.slots.map((slot, index) => (
          <div key={slot.key} className="flex flex-col gap-4">
            {index > 0 && <Separator />}
            <div className="flex flex-col gap-2">
              <ShiftDisplay
                label={slot.label}
                startTime={slot.startTime}
                endTime={slot.endTime}
                employeeName={slot.employeeName}
                isOneOff={slot.isOneOff}
              />
              {canEdit && (
                <ShiftAssignmentDialog shiftDate={day.iso} slot={slot} employees={employees} />
              )}
            </div>
          </div>
        ))}

        {canEdit && (
          <div>
            <CreateShiftDialog
              defaultDate={day.iso}
              employees={employees}
              triggerLabel="Weitere Schicht"
              compact
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
