"use client";

import { useTransition } from "react";

import { revokeInvite, type InviteListItem } from "@/lib/admin/invites";
import { ROLE_LABELS } from "@/lib/auth/roles";
import { Button } from "@/components/ui/button";

const dateFormatter = new Intl.DateTimeFormat("de-DE", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

function inviteStatusLabel(invite: InviteListItem): string {
  if (invite.usedAt) return `Eingelöst von ${invite.usedByName ?? "unbekannt"}`;
  if (new Date(invite.expiresAt) < new Date()) return "Abgelaufen";
  return `Offen bis ${dateFormatter.format(new Date(invite.expiresAt))}`;
}

export function InviteList({
  invites,
  onRevoked,
}: {
  invites: InviteListItem[];
  onRevoked: () => void;
}) {
  const [isPending, startTransition] = useTransition();

  function handleRevoke(id: string) {
    startTransition(async () => {
      await revokeInvite(id);
      onRevoked();
    });
  }

  if (invites.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">Noch keine Einladungen erstellt.</p>
    );
  }

  return (
    <ul className="flex flex-col gap-2">
      {invites.map((invite) => {
        const pending = !invite.usedAt && new Date(invite.expiresAt) >= new Date();
        return (
          <li
            key={invite.id}
            className="flex items-center justify-between gap-2 rounded-lg border border-border p-2"
          >
            <div className="flex flex-col">
              <span className="text-sm font-medium text-foreground">
                {ROLE_LABELS[invite.role]}
              </span>
              <span className="text-xs text-muted-foreground">{inviteStatusLabel(invite)}</span>
            </div>
            {pending && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={isPending}
                onClick={() => handleRevoke(invite.id)}
              >
                Widerrufen
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}
