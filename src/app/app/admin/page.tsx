import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { LinkButton } from "@/components/ui/button";
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
        <h1 className="text-lg font-semibold text-foreground">Verwaltung</h1>
        <Card>
          <CardContent className="flex flex-col gap-3">
            <LinkButton variant="outline" href="/app/admin/mitarbeiter">
              Mitarbeiter
            </LinkButton>
            <LinkButton variant="outline" href="/app/admin/monatsuebersicht">
              Monatsübersicht
            </LinkButton>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
