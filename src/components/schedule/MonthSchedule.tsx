import { toISODate } from "@/lib/shifts/dates";
import type { AssignableEmployee } from "@/lib/shifts/queries";
import type { DaySchedule } from "@/lib/shifts/schedule";
import { CreateShiftDialog } from "@/components/schedule/CreateShiftDialog";
import { DayCard } from "@/components/schedule/DayCard";
import { MonthNav } from "@/components/schedule/MonthNav";
import { LinkButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export function MonthSchedule({
  year,
  month,
  days,
  canEdit = false,
  canManageTemplates = false,
  employees = [],
}: {
  year: number;
  month: number;
  days: DaySchedule[];
  canEdit?: boolean;
  canManageTemplates?: boolean;
  employees?: AssignableEmployee[];
}) {
  const firstOfMonth = toISODate({ year, month, day: 1 });

  return (
    <div className="flex flex-col gap-6">
      <MonthNav year={year} month={month} basePath="/app/dienstplan" />

      {(canEdit || canManageTemplates) && (
        <div className="flex flex-wrap items-center justify-end gap-2">
          {canManageTemplates && (
            <LinkButton variant="outline" size="sm" href="/app/schichtvorlagen">
              Schichtvorlagen
            </LinkButton>
          )}
          {canEdit && <CreateShiftDialog defaultDate={firstOfMonth} employees={employees} />}
        </div>
      )}

      {days.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col gap-1">
            <p className="text-foreground">In diesem Monat sind keine Schichten geplant.</p>
            <p className="text-sm text-muted-foreground">
              {canManageTemplates
                ? "Lege unter „Schichtvorlagen“ wiederkehrende Schichten an (z. B. jeden Samstag 08–14 Uhr) oder füge eine einmalige Schicht hinzu."
                : "Sobald Schichten geplant sind, erscheinen sie hier."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {days.map((day) => (
            <DayCard key={day.iso} day={day} canEdit={canEdit} employees={employees} />
          ))}
        </div>
      )}
    </div>
  );
}
