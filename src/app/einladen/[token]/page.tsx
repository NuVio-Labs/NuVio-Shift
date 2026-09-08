import { getInviteByToken } from "@/lib/invites/queries";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { InviteAcceptForm } from "@/components/invites/InviteAcceptForm";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

const ERROR_MESSAGES = {
  invalid: "Diese Einladung ist ungültig.",
  expired: "Diese Einladung ist abgelaufen. Bitte frage deine Ansprechperson nach einer neuen.",
  used: "Diese Einladung wurde bereits verwendet.",
} as const;

export default async function EinladenPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invite = await getInviteByToken(token);

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="flex w-full max-w-sm flex-col items-center gap-6">
        <div className="flex flex-col items-center gap-1 text-center">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            NuVio Shift
          </h1>
          <p className="text-sm text-muted-foreground">
            Schichten. Einfach geplant.
          </p>
        </div>

        {invite.status !== "valid" ? (
          <Card className="w-full">
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {ERROR_MESSAGES[invite.status]}
              </p>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full">
            <CardHeader>
              <p className="text-sm text-muted-foreground">
                Du wurdest zu <span className="font-medium text-foreground">{invite.companyName}</span> als{" "}
                {ROLE_LABELS[invite.role]} eingeladen. Erstelle dein Konto:
              </p>
            </CardHeader>
            <CardContent>
              <InviteAcceptForm token={token} />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
