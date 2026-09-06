import { formatGermanDayMonth } from "@/lib/shifts/dates";
import type { AssignableEmployee } from "@/lib/shifts/queries";
import type { SaturdaySchedule } from "@/lib/shifts/schedule";
import { ShiftAssignmentDialog } from "@/components/schedule/ShiftAssignmentDialog";
import { ShiftDisplay } from "@/components/schedule/ShiftDisplay";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function SaturdayCard({
  schedule,
  canEdit = false,
  employees = [],
}: {
  schedule: SaturdaySchedule;
  canEdit?: boolean;
  employees?: AssignableEmployee[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Samstag, {formatGermanDayMonth(schedule.date)}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <ShiftDisplay shiftType="early" assignment={schedule.early} />
          {canEdit && (
            <ShiftAssignmentDialog
              shiftDate={schedule.iso}
              shiftType="early"
              currentEmployeeId={schedule.early?.employeeId ?? null}
              currentEmployeeName={schedule.early?.employeeName ?? null}
              employees={employees}
            />
          )}
        </div>
        <div className="flex flex-col gap-2">
          <ShiftDisplay shiftType="late" assignment={schedule.late} />
          {canEdit && (
            <ShiftAssignmentDialog
              shiftDate={schedule.iso}
              shiftType="late"
              currentEmployeeId={schedule.late?.employeeId ?? null}
              currentEmployeeName={schedule.late?.employeeName ?? null}
              employees={employees}
            />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
