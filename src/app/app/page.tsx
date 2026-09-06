import Link from "next/link";
import { redirect } from "next/navigation";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { logout } from "@/lib/auth/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <h1 className="text-center text-xl font-semibold tracking-tight text-foreground">
          NuVio Shift
        </h1>
        <Card>
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
        </Card>
      </div>
    </div>
  );
}

function LogoutButton() {
  return (
    <form action={logout}>
      <Button type="submit" variant="outline" className="w-full">
        Abmelden
      </Button>
    </form>
  );
}

export default async function AppHomePage() {
  const result = await getCurrentUserProfile();

  if (result.status === "unauthenticated") {
    redirect("/login");
  }

  if (result.status === "error") {
    return (
      <AppShell>
        <p className="text-muted-foreground">
          Dein Profil konnte nicht geladen werden. Bitte versuche es erneut.
        </p>
        <LogoutButton />
      </AppShell>
    );
  }

  if (result.status === "no_profile") {
    return (
      <AppShell>
        <p className="text-muted-foreground">
          Für diesen Benutzer wurde noch kein NuVio-Shift-Profil eingerichtet.
          Bitte wende dich an deine Ansprechperson.
        </p>
        <LogoutButton />
      </AppShell>
    );
  }

  if (result.status === "inactive") {
    return (
      <AppShell>
        <p className="text-muted-foreground">
          Dieser Zugang ist deaktiviert. Bitte wende dich an deine
          Ansprechperson.
        </p>
        <LogoutButton />
      </AppShell>
    );
  }

  const { profile } = result;

  return (
    <AppShell>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Angemeldet als:</p>
        <p className="text-lg font-medium text-foreground">{profile.name}</p>
      </div>
      <div className="flex flex-col gap-1">
        <p className="text-sm text-muted-foreground">Rolle:</p>
        <p className="text-lg font-medium text-foreground">
          {ROLE_LABELS[profile.role]}
        </p>
      </div>
      {profile.role === "scheduler" && (
        <Button render={<Link href="/app/dienstplan" />}>
          Dienstplan öffnen
        </Button>
      )}
      {profile.role === "admin" && (
        <Button render={<Link href="/app/dienstplan" />}>
          Dienstplan ansehen
        </Button>
      )}
      {profile.role === "admin" && (
        <Button variant="outline" render={<Link href="/app/admin" />}>
          Verwaltung
        </Button>
      )}
      <Button
        variant={profile.role === "employee" ? "default" : "outline"}
        render={<Link href="/app/meine-schichten" />}
      >
        Meine Schichten
      </Button>
      <Button variant="outline" render={<Link href="/app/benachrichtigungen" />}>
        Benachrichtigungen
      </Button>
      <LogoutButton />
    </AppShell>
  );
}
