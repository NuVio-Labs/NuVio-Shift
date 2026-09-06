import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { PushNotificationSettings } from "@/components/push/PushNotificationSettings";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default async function BenachrichtigungenPage() {
  const result = await getCurrentUserProfile();

  if (result.status === "unauthenticated") {
    redirect("/login");
  }

  // no_profile / inactive / error: /app already explains these clearly.
  if (result.status !== "ok") {
    redirect("/app");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex items-center justify-between gap-2">
          <h1 className="text-lg font-semibold text-foreground">
            Benachrichtigungen
          </h1>
          <Button variant="outline" size="sm" render={<Link href="/app" />}>
            Zurück
          </Button>
        </div>
        <Card>
          <CardContent className="flex flex-col gap-4">
            <p className="text-sm text-muted-foreground">
              Die Push-Funktion wird für zukünftige Schichtbenachrichtigungen
              vorbereitet.
            </p>
            <PushNotificationSettings />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
