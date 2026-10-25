import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { getGermanWeekdayName, ISO_WEEKDAYS } from "@/lib/shifts/dates";
import { getShiftTemplates, type ShiftTemplate } from "@/lib/shifts/queries";
import { durationHours, formatHours } from "@/lib/shifts/time";
import { TemplateActiveToggle } from "@/components/templates/TemplateActiveToggle";
import { TemplateFormDialog } from "@/components/templates/TemplateFormDialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "cn";

export default async function SchichtvorlagenPage() {
  const result = await getCurrentUserProfile();

  if (
    result.status !== "ok" ||
    (result.profile.role !== "admin" && result.profile.role !== "scheduler")
  ) {
    redirect("/app");
  }

  const templatesResult = await getShiftTemplates({ includeInactive: true });

  const byWeekday = new Map<number, ShiftTemplate[]>();
  if (templatesResult.status === "ok") {
    for (const template of templatesResult.templates) {
      const list = byWeekday.get(template.weekday) ?? [];
      list.push(template);
      byWeekday.set(template.weekday, list);
    }
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h1 className="text-lg font-semibold text-foreground">Schichtvorlagen</h1>
            <p className="text-sm text-muted-foreground">
              Wiederkehrende Schichten erscheinen jede Woche automatisch im Dienstplan.
            </p>
          </div>
          <TemplateFormDialog />
        </div>

        {templatesResult.status === "error" ? (
          <Card>
            <CardContent>
              <p className="text-muted-foreground">
                Die Vorlagen konnten nicht geladen werden. Bitte versuche es erneut.
              </p>
            </CardContent>
          </Card>
        ) : templatesResult.templates.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col gap-1">
              <p className="text-foreground">Noch keine Vorlagen angelegt.</p>
              <p className="text-sm text-muted-foreground">
                Beispiel: „Früh“, jeden Samstag, 08:00–14:00 — oder „Putzen“, jeden Dienstag,
                09:00–12:00.
              </p>
            </CardContent>
          </Card>
        ) : (
          ISO_WEEKDAYS.filter((weekday) => byWeekday.has(weekday)).map((weekday) => (
            <Card key={weekday}>
              <CardHeader>
                <CardTitle>{getGermanWeekdayName(weekday)}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col divide-y divide-border">
                {byWeekday.get(weekday)!.map((template) => (
                  <div
                    key={template.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className={cn("flex flex-col gap-0.5", !template.active && "opacity-50")}>
                      <p className="text-sm font-medium text-foreground">
                        {template.label}
                        {!template.active && (
                          <span className="ml-2 text-xs font-normal text-muted-foreground">
                            (deaktiviert)
                          </span>
                        )}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {template.startTime}–{template.endTime} ·{" "}
                        {formatHours(durationHours(template.startTime, template.endTime))} Std.
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      <TemplateActiveToggle id={template.id} active={template.active} />
                      <TemplateFormDialog template={template} />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
