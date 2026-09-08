import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { normalizeYearMonth } from "@/lib/shifts/dates";
import { getShiftsForMonth } from "@/lib/shifts/queries";
import { buildMonthlyEmployeeTotals } from "@/lib/shifts/schedule";
import { MonthNav } from "@/components/schedule/MonthNav";
import { Card, CardContent } from "@/components/ui/card";

type MonatsuebersichtSearchParams = {
  year?: string;
  month?: string;
};

export default async function AdminMonatsuebersichtPage({
  searchParams,
}: {
  searchParams: Promise<MonatsuebersichtSearchParams>;
}) {
  const result = await getCurrentUserProfile();

  if (result.status !== "ok" || result.profile.role !== "admin") {
    redirect("/app");
  }

  const params = await searchParams;
  const { year, month } = normalizeYearMonth(params.year, params.month);

  const shiftsResult = await getShiftsForMonth(year, month);
  const totals =
    shiftsResult.status === "ok" ? buildMonthlyEmployeeTotals(shiftsResult.shiftsByDate) : [];

  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <MonthNav year={year} month={month} basePath="/app/admin/monatsuebersicht" />

        {shiftsResult.status === "error" ? (
          <Card>
            <CardContent>
              <p className="text-muted-foreground">
                Die Monatsübersicht konnte nicht geladen werden. Bitte
                versuche es erneut.
              </p>
            </CardContent>
          </Card>
        ) : totals.length === 0 ? (
          <Card>
            <CardContent>
              <p className="text-muted-foreground">
                Für diesen Monat sind noch keine Schichten zugewiesen.
              </p>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Desktop / tablet */}
            <div className="hidden overflow-x-auto rounded-xl ring-1 ring-foreground/10 md:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-border bg-muted/50">
                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                      Name
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                      Schichten
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                      Geplante Stunden
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {totals.map((total) => (
                    <tr key={total.employeeId} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {total.employeeName}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {total.shiftCount}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {total.plannedHours} Std.
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="flex flex-col gap-3 md:hidden">
              {totals.map((total) => (
                <Card key={total.employeeId}>
                  <CardContent className="flex flex-col gap-1">
                    <p className="text-base font-medium text-foreground">
                      {total.employeeName}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {total.shiftCount} Schichten · {total.plannedHours} geplante Stunden
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
