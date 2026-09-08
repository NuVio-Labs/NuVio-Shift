import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { getMyShifts } from "@/lib/shifts/queries";
import { MyShiftCard } from "@/components/shifts/MyShiftCard";
import { Card, CardContent } from "@/components/ui/card";

export default async function MeineSchichtenPage() {
  const result = await getCurrentUserProfile();

  if (result.status === "unauthenticated") {
    redirect("/login");
  }

  // no_profile / inactive / error: /app already explains these clearly —
  // no need for a parallel message here.
  if (result.status !== "ok") {
    redirect("/app");
  }

  const shiftsResult = await getMyShifts();

  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-md flex-col gap-6">
        <h1 className="text-lg font-semibold text-foreground">Meine Schichten</h1>

        {shiftsResult.status !== "ok" ? (
          <Card>
            <CardContent>
              <p className="text-muted-foreground">
                Deine Schichten konnten nicht geladen werden. Bitte versuche
                es erneut.
              </p>
            </CardContent>
          </Card>
        ) : shiftsResult.shifts.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col gap-1">
              <p className="text-foreground">
                Du bist aktuell für keine Schicht eingeteilt.
              </p>
              <p className="text-sm text-muted-foreground">
                Neue Einteilungen erscheinen hier automatisch.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <h2 className="text-sm font-medium text-muted-foreground">
                Nächste Schicht
              </h2>
              <MyShiftCard shift={shiftsResult.shifts[0]} highlighted />
            </div>

            {shiftsResult.shifts.length > 1 && (
              <div className="flex flex-col gap-2">
                <h2 className="text-sm font-medium text-muted-foreground">
                  Weitere Schichten
                </h2>
                <div className="flex flex-col gap-3">
                  {shiftsResult.shifts.slice(1).map((shift) => (
                    <MyShiftCard key={shift.id} shift={shift} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
