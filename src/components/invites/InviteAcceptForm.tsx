"use client";

import { useActionState } from "react";

import { acceptInvite, type AcceptInviteState } from "@/lib/invites/actions";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldError } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: AcceptInviteState = { status: "idle" };

export function InviteAcceptForm({ token }: { token: string }) {
  const [state, formAction, isPending] = useActionState(acceptInvite, initialState);

  return (
    <form action={formAction} className="w-full">
      <input type="hidden" name="token" value={token} />
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input id="name" name="name" autoComplete="name" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="email">E-Mail</FieldLabel>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </Field>
        <Field>
          <FieldLabel htmlFor="password">Passwort</FieldLabel>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={8}
          />
        </Field>
        {state.status === "error" && <FieldError>{state.message}</FieldError>}
        <Button type="submit" disabled={isPending} className="w-full">
          {isPending ? "Wird erstellt…" : "Konto erstellen"}
        </Button>
      </FieldGroup>
    </form>
  );
}
