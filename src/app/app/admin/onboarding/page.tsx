import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { listInvites } from "@/lib/admin/invites";
import { OnboardingPanel } from "@/components/admin/OnboardingPanel";
import { Card, CardContent } from "@/components/ui/card";

export default async function AdminOnboardingPage() {
  const result = await getCurrentUserProfile();

  if (result.status !== "ok" || result.profile.role !== "admin") {
    redirect("/app");
  }

  const invitesResult = await listInvites();

  return (
    <div className="flex flex-1 flex-col px-4 py-8 md:px-8">
      <div className="mx-auto flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-lg font-semibold text-foreground">Onboarding</h1>

        <Card>
          <CardContent>
            {invitesResult.status === "error" ? (
              <p className="text-sm text-muted-foreground">
                Einladungen konnten nicht geladen werden. Bitte versuche es
                erneut.
              </p>
            ) : (
              <OnboardingPanel initialInvites={invitesResult.invites} />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
