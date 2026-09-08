"use server";

import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/service";
import type { UserRole } from "@/types/domain";

export type AcceptInviteState =
  | { status: "idle" }
  | { status: "error"; message: string };

const MIN_PASSWORD_LENGTH = 8;

export async function acceptInvite(
  _prevState: AcceptInviteState,
  formData: FormData,
): Promise<AcceptInviteState> {
  const token = String(formData.get("token") ?? "").trim();
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!token) {
    return { status: "error", message: "Ungültige Einladung." };
  }
  if (!name) {
    return { status: "error", message: "Bitte gib deinen Namen ein." };
  }
  if (!email) {
    return { status: "error", message: "Bitte gib deine E-Mail-Adresse ein." };
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    return {
      status: "error",
      message: `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen haben.`,
    };
  }

  const supabase = createServiceRoleClient();

  const { data: invite, error: inviteError } = await supabase
    .from("invites")
    .select("id, company_id, role, expires_at, used_at")
    .eq("token", token)
    .maybeSingle();

  if (inviteError || !invite) {
    return { status: "error", message: "Diese Einladung ist ungültig." };
  }
  if (invite.used_at) {
    return { status: "error", message: "Diese Einladung wurde bereits verwendet." };
  }
  if (new Date(invite.expires_at) < new Date()) {
    return { status: "error", message: "Diese Einladung ist abgelaufen." };
  }

  // Claim the token atomically first — the conditional `is("used_at", null)`
  // means at most one concurrent redemption attempt can win this update.
  const { data: claimed, error: claimError } = await supabase
    .from("invites")
    .update({ used_at: new Date().toISOString() })
    .eq("id", invite.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle();

  if (claimError || !claimed) {
    return { status: "error", message: "Diese Einladung wurde soeben bereits verwendet." };
  }

  const { data: createdUser, error: createUserError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (createUserError || !createdUser.user) {
    // Give the token back — the invite itself is still legitimate, only
    // this attempt failed (e.g. the email is already registered).
    await supabase.from("invites").update({ used_at: null }).eq("id", invite.id);

    return {
      status: "error",
      message: createUserError?.message.includes("already been registered")
        ? "Für diese E-Mail-Adresse existiert bereits ein Konto."
        : "Das Konto konnte nicht erstellt werden. Bitte versuche es erneut.",
    };
  }

  const { error: profileError } = await supabase.from("profiles").insert({
    id: createdUser.user.id,
    name,
    role: invite.role as UserRole,
    company_id: invite.company_id,
    active: true,
  });

  if (profileError) {
    // Clean up the orphaned auth user and give the token back so the
    // invite can still be redeemed on a retry.
    await supabase.auth.admin.deleteUser(createdUser.user.id);
    await supabase.from("invites").update({ used_at: null }).eq("id", invite.id);

    return {
      status: "error",
      message: "Dein Profil konnte nicht angelegt werden. Bitte versuche es erneut.",
    };
  }

  await supabase.from("invites").update({ used_by: createdUser.user.id }).eq("id", invite.id);

  const sessionClient = await createClient();
  const { error: signInError } = await sessionClient.auth.signInWithPassword({ email, password });

  if (signInError) {
    redirect("/login");
  }

  redirect("/app");
}
