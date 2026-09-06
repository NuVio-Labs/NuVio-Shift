import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminPage() {
  const result = await getCurrentUserProfile();

  // no_profile / inactive / error / unauthenticated: /app already explains
  // these; scheduler and employee simply have no business here.
  if (result.status !== "ok" || result.profile.role !== "admin") {
    redirect("/app");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-foreground">Verwaltung</h1>
          <Button variant="outline" size="sm" render={<Link href="/app" />}>
            Zurück
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-3">
            <Button variant="outline" render={<Link href="/app/admin/mitarbeiter" />}>
              Mitarbeiter
            </Button>
            <Button variant="outline" render={<Link href="/app/admin/monatsuebersicht" />}>
              Monatsübersicht
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
