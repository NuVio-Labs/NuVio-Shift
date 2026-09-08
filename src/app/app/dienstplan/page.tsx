import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { normalizeYearMonth } from "@/lib/shifts/dates";
import { getAssignableEmployees, getShiftsForMonth } from "@/lib/shifts/queries";
import { buildMonthSchedule } from "@/lib/shifts/schedule";
import { MonthSchedule } from "@/components/schedule/MonthSchedule";
import { Card, CardContent } from "@/components/ui/card";

type DienstplanSearchParams = {
  year?: string;
  month?: string;
};

export default async function DienstplanPage({
  searchParams,
}: {
  searchParams: Promise<DienstplanSearchParams>;
}) {
  const result = await getCurrentUserProfile();

  // Reuse M3's existing status handling instead of a parallel auth path:
  // anything other than an active profile with schedule access just goes
  // back to /app, which already explains "no profile" / "deactivated".
  if (result.status !== "ok") {
    redirect("/app");
  }

  if (result.profile.role !== "scheduler" && result.profile.role !== "admin") {
    redirect("/app");
  }

  const canEdit = result.profile.role === "scheduler";

  const params = await searchParams;
  const { year, month } = normalizeYearMonth(params.year, params.month);

  const [shiftsResult, employeesResult] = await Promise.all([
    getShiftsForMonth(year, month),
    canEdit ? getAssignableEmployees() : Promise.resolve({ status: "ok" as const, employees: [] }),
  ]);

  if (shiftsResult.status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
        <Card className="w-full max-w-sm">
          <CardContent>
            <p className="text-muted-foreground">
              Der Dienstplan konnte nicht geladen werden. Bitte versuche es
              erneut.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const schedules = buildMonthSchedule(year, month, shiftsResult.shiftsByDate);
  const employees = employeesResult.status === "ok" ? employeesResult.employees : [];

  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <MonthSchedule
          year={year}
          month={month}
          schedules={schedules}
          canEdit={canEdit}
          employees={employees}
        />
      </div>
    </div>
  );
}
