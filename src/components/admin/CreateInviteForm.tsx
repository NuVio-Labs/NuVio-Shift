"use client";

import { useState, useTransition } from "react";
import { CopyIcon } from "lucide-react";

import { createInvite } from "@/lib/admin/invites";
import { ROLE_LABELS } from "@/lib/auth/roles";
import type { UserRole } from "@/types/domain";
import { Button } from "@/components/ui/button";
import { Field, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const INVITABLE_ROLES: UserRole[] = ["employee", "scheduler", "admin"];

export function CreateInviteForm({ onCreated }: { onCreated: () => void }) {
  const [role, setRole] = useState<UserRole>("employee");
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleCreate() {
    setError(null);
    setLink(null);
    setCopied(false);
    startTransition(async () => {
      const result = await createInvite({ role });
      if (result.status === "error") {
        setError(result.message);
        return;
      }
      setLink(`${window.location.origin}/einladen/${result.token}`);
      onCreated();
    });
  }

  async function handleCopy() {
    if (!link) return;
    await navigator.clipboard.writeText(link);
    setCopied(true);
  }

  return (
    <div className="flex flex-col gap-3">
      <Field>
        <FieldLabel htmlFor="invite-role">Rolle</FieldLabel>
        <Select value={role} onValueChange={(value) => setRole(value as UserRole)}>
          <SelectTrigger id="invite-role" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {INVITABLE_ROLES.map((r) => (
              <SelectItem key={r} value={r}>
                {ROLE_LABELS[r]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Field>

      <Button onClick={handleCreate} disabled={isPending}>
        {isPending ? "Erstelle…" : "Einladungslink erstellen"}
      </Button>

      {error && <p className="text-sm text-destructive">{error}</p>}

      {link && (
        <div className="flex items-center gap-2 rounded-lg border border-input p-2">
          <span className="flex-1 truncate text-sm text-foreground">{link}</span>
          <Button type="button" variant="outline" size="icon-sm" onClick={handleCopy}>
            <CopyIcon className="size-4" />
            <span className="sr-only">Link kopieren</span>
          </Button>
        </div>
      )}
      {copied && <p className="text-xs text-muted-foreground">Kopiert.</p>}
    </div>
  );
}
