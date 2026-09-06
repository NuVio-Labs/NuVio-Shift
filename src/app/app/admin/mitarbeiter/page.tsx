import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { getManagedProfiles } from "@/lib/admin/queries";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminMitarbeiterPage() {
  const result = await getCurrentUserProfile();

  if (result.status !== "ok" || result.profile.role !== "admin") {
    redirect("/app");
  }

  const profilesResult = await getManagedProfiles();

  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-foreground">Mitarbeiter</h1>
          <Button variant="outline" size="sm" render={<Link href="/app/admin" />}>
            Zurück
          </Button>
        </div>

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
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile */}
            <div className="flex flex-col gap-3 md:hidden">
              {profilesResult.profiles.map((profile) => (
                <Card key={profile.id}>
                  <CardContent className="flex flex-col gap-1">
                    <p className="text-base font-medium text-foreground">{profile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {ROLE_LABELS[profile.role]} · {profile.active ? "Aktiv" : "Inaktiv"}
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
