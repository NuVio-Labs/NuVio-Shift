import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { getOwnProfileSettings } from "@/lib/profile/queries";
import { ProfileSettingsForm } from "@/components/settings/ProfileSettingsForm";
import { PushNotificationSettings } from "@/components/push/PushNotificationSettings";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTab, TabsPanel } from "@/components/ui/tabs";

export default async function EinstellungenPage() {
  const result = await getCurrentUserProfile();

  if (result.status === "unauthenticated") {
    redirect("/login");
  }

  // no_profile / inactive / error: /app already explains these clearly.
  if (result.status !== "ok") {
    redirect("/app");
  }

  const settingsResult = await getOwnProfileSettings();

  return (
    <div className="flex flex-1 flex-col items-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-lg font-semibold text-foreground">Einstellungen</h1>

        <Tabs defaultValue="profil">
          <TabsList>
            <TabsTab value="profil">Profil</TabsTab>
            <TabsTab value="benachrichtigungen">Benachrichtigungen</TabsTab>
          </TabsList>

          <TabsPanel value="profil">
            <Card>
              <CardContent>
                {settingsResult.status === "error" ? (
                  <p className="text-sm text-muted-foreground">
                    Deine Angaben konnten nicht geladen werden. Bitte versuche
                    es erneut.
                  </p>
                ) : (
                  <ProfileSettingsForm settings={settingsResult.settings} />
                )}
              </CardContent>
            </Card>
          </TabsPanel>

          <TabsPanel value="benachrichtigungen">
            <Card>
              <CardContent className="flex flex-col gap-4">
                <p className="text-sm text-muted-foreground">
                  Die Push-Funktion wird für zukünftige
                  Schichtbenachrichtigungen vorbereitet.
                </p>
                <PushNotificationSettings />
              </CardContent>
            </Card>
          </TabsPanel>
        </Tabs>
      </div>
    </div>
  );
}
