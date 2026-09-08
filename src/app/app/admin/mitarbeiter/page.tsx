import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { getManagedProfiles } from "@/lib/admin/queries";
import { getEmployeeCompensationMap } from "@/lib/admin/compensation";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { HourlyWageEditor } from "@/components/admin/HourlyWageEditor";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminMitarbeiterPage() {
  const result = await getCurrentUserProfile();

  if (result.status !== "ok" || result.profile.role !== "admin") {
    redirect("/app");
  }

  const [profilesResult, compensationResult] = await Promise.all([
    getManagedProfiles(),
    getEmployeeCompensationMap(),
  ]);
  const compensationByProfileId =
    compensationResult.status === "ok" ? compensationResult.compensationByProfileId : {};

  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <h1 className="text-lg font-semibold text-foreground">Mitarbeiter</h1>

        {profilesResult.status === "error" ? (
          <Card>
            <CardContent>
              <p className="text-muted-foreground">
                Die Mitarbeiterliste konnte nicht geladen werden. Bitte
                versuche es erneut.
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
                      Rolle
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-4 py-3 text-sm font-medium text-muted-foreground">
                      Stundengehalt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {profilesResult.profiles.map((profile) => (
                    <tr key={profile.id} className="border-b border-border last:border-0">
                      <td className="px-4 py-3 text-sm font-medium text-foreground">
                        {profile.name}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {ROLE_LABELS[profile.role]}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {profile.active ? "Aktiv" : "Inaktiv"}
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        <HourlyWageEditor
                          profileId={profile.id}
                          initialHourlyWage={compensationByProfileId[profile.id] ?? null}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="flex flex-col gap-3 md:hidden">
              {profilesResult.profiles.map((profile) => (
                <Card key={profile.id}>
                  <CardContent className="flex flex-col gap-2">
                    <p className="text-base font-medium text-foreground">{profile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ROLE_LABELS[profile.role]} · {profile.active ? "Aktiv" : "Inaktiv"}
                    </p>
                    <HourlyWageEditor
                      profileId={profile.id}
                      initialHourlyWage={compensationByProfileId[profile.id] ?? null}
                    />
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
