"use client";

import { useActionState, useState } from "react";

import { updateOwnProfile, type ProfileMutationState } from "@/lib/profile/actions";
import type { OwnProfileSettings } from "@/lib/profile/queries";
import { Button } from "@/components/ui/button";
import { Field, FieldGroup, FieldLabel, FieldError, FieldDescription } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

const initialState: ProfileMutationState = { status: "idle" };

const hourlyWageFormatter = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});

export function ProfileSettingsForm({ settings }: { settings: OwnProfileSettings }) {
  const [state, formAction, isPending] = useActionState(updateOwnProfile, initialState);
  const [name, setName] = useState(settings.name);
  const [phone, setPhone] = useState(settings.phone ?? "");
  const [weeklyTargetHours, setWeeklyTargetHours] = useState(
    settings.weeklyTargetHours?.toString() ?? ""
  );

  return (
    <form action={formAction} className="w-full">
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="name">Name</FieldLabel>
          <Input
            id="name"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="email">E-Mail</FieldLabel>
          <Input id="email" value={settings.email ?? ""} disabled readOnly />
        </Field>

        <Field>
          <FieldLabel htmlFor="phone">Telefon</FieldLabel>
          <Input
            id="phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="weeklyTargetHours">Wochenziel-Stunden</FieldLabel>
          <Input
            id="weeklyTargetHours"
            name="weeklyTargetHours"
            type="number"
            min={0}
            max={80}
            step={0.5}
            value={weeklyTargetHours}
            onChange={(e) => setWeeklyTargetHours(e.target.value)}
          />
        </Field>

        <Field>
          <FieldLabel htmlFor="hourlyWage">Stundengehalt</FieldLabel>
          <Input
            id="hourlyWage"
            value={
              settings.hourlyWage !== null
                ? hourlyWageFormatter.format(settings.hourlyWage)
                : "Noch nicht festgelegt"
            }
            disabled
            readOnly
          />
          <FieldDescription>Wird vom Admin festgelegt.</FieldDescription>
        </Field>

        {state.status === "error" && <FieldError>{state.message}</FieldError>}
        {state.status === "ok" && (
          <p className="text-sm text-foreground">Gespeichert.</p>
        )}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Speichern…" : "Speichern"}
        </Button>
      </FieldGroup>
    </form>
  );
}
