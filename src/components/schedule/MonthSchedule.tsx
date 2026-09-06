import { formatGermanDate } from "@/lib/shifts/dates";
import type { AssignableEmployee } from "@/lib/shifts/queries";
import type { SaturdaySchedule } from "@/lib/shifts/schedule";
import { MonthNav } from "@/components/schedule/MonthNav";
import { SaturdayCard } from "@/components/schedule/SaturdayCard";
import { ShiftAssignmentDialog } from "@/components/schedule/ShiftAssignmentDialog";
import { ShiftDisplay } from "@/components/schedule/ShiftDisplay";

export function MonthSchedule({
  year,
  month,
  schedules,
  canEdit = false,
  employees = [],
}: {
  year: number;
  month: number;
  schedules: SaturdaySchedule[];
  canEdit?: boolean;
  employees?: AssignableEmployee[];
}) {
  return (
    <div className="flex flex-col gap-6">
      <MonthNav year={year} month={month} basePath="/app/dienstplan" />

      {/* Desktop / tablet */}
      <div className="hidden overflow-x-auto rounded-xl ring-1 ring-foreground/10 md:block">
        <table className="w-full border-collapse text-left">
          <thead>
            <tr className="border-b border-border bg-muted/50">
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                Samstag
              </th>
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                Früh
              </th>
              <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                Spät
              </th>
            </tr>
          </thead>
          <tbody>
            {schedules.map((schedule) => (
              <tr key={schedule.iso} className="border-b border-border last:border-0">
                <td className="px-4 py-3 align-top text-sm font-medium text-foreground">
                  {formatGermanDate(schedule.date)}
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-2">
                    <ShiftDisplay
                      shiftType="early"
                      assignment={schedule.early}
                      showLabel={false}
                    />
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
                </td>
                <td className="px-4 py-3 align-top">
                  <div className="flex flex-col gap-2">
                    <ShiftDisplay
                      shiftType="late"
                      assignment={schedule.late}
                      showLabel={false}
                    />
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
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile */}
      <div className="flex flex-col gap-4 md:hidden">
        {schedules.map((schedule) => (
          <SaturdayCard
            key={schedule.iso}
            schedule={schedule}
            canEdit={canEdit}
            employees={employees}
          />
        ))}
      </div>
    </div>
  );
}
