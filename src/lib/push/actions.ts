"use server";

import { getCurrentUserProfile } from "@/lib/auth/profile";
import { createClient } from "@/lib/supabase/server";
import { sendPushNotification, type PushSubscriptionKeys } from "@/lib/push/server";

export type PushActionResult =
  | { status: "ok" }
  | { status: "error"; message: string };

const GENERIC_ERROR: PushActionResult = {
  status: "error",
  message: "Das Gerät konnte nicht gespeichert werden. Bitte versuche es erneut.",
};

const PERMISSION_ERROR: PushActionResult = {
  status: "error",
  message: "Du musst angemeldet sein, um Benachrichtigungen zu aktivieren.",
};

const ENDPOINT_TAKEN_ERROR: PushActionResult = {
  status: "error",
  message: "Dieses Gerät ist bereits einem anderen Konto zugeordnet.",
};

/** `active = true` is already required for `getCurrentUserProfile()` to return "ok". */
async function requireActiveUser() {
  const result = await getCurrentUserProfile();
  if (result.status !== "ok") return null;
  return result.profile;
}

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === "23505";
}

export async function savePushSubscription(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
}): Promise<PushActionResult> {
  const user = await requireActiveUser();
  if (!user) return PERMISSION_ERROR;

  if (
    typeof input.endpoint !== "string" ||
    !input.endpoint ||
    typeof input.p256dh !== "string" ||
    !input.p256dh ||
    typeof input.auth !== "string" ||
    !input.auth
  ) {
    return GENERIC_ERROR;
  }

  const supabase = await createClient();

  // RLS only ever lets us see our own rows, so finding nothing here means
  // either this endpoint is brand new, or it belongs to someone else — the
  // INSERT below tells those two cases apart via the unique constraint.
  const { data: existing, error: lookupError } = await supabase
    .from("push_subscriptions")
    .select("id")
    .eq("endpoint", input.endpoint)
    .eq("user_id", user.id)
    .maybeSingle();

  if (lookupError) return GENERIC_ERROR;

  if (existing) {
    const { error } = await supabase
      .from("push_subscriptions")
      .update({ p256dh: input.p256dh, auth: input.auth })
      .eq("id", existing.id)
      .eq("user_id", user.id);

    return error ? GENERIC_ERROR : { status: "ok" };
  }

  const { error } = await supabase.from("push_subscriptions").insert({
    user_id: user.id,
    endpoint: input.endpoint,
    p256dh: input.p256dh,
    auth: input.auth,
  });

  if (error) {
    return isUniqueViolation(error) ? ENDPOINT_TAKEN_ERROR : GENERIC_ERROR;
  }

  return { status: "ok" };
}

export async function removePushSubscription(endpoint: string): Promise<PushActionResult> {
  const user = await requireActiveUser();
  if (!user) return PERMISSION_ERROR;

  if (typeof endpoint !== "string" || !endpoint) {
    return { status: "ok" }; // nothing to remove
  }

  const supabase = await createClient();

  const { error } = await supabase
    .from("push_subscriptions")
    .delete()
    .eq("endpoint", endpoint)
    .eq("user_id", user.id);

  return error ? GENERIC_ERROR : { status: "ok" };
}

export type SendTestPushResult =
  | { status: "sent"; deliveredCount: number }
  | { status: "no_devices" }
  | { status: "error"; message: string };

const TEST_PUSH_PAYLOAD = {
  title: "NuVio Shift",
  body: "Benachrichtigungen funktionieren.",
  url: "/app/meine-schichten",
};

/**
 * Sends a test push to every device the *currently authenticated* user has
 * registered — never another employee's. The client never supplies a user
 * id; it's resolved fresh from the session on every call.
 */
export async function sendTestPush(): Promise<SendTestPushResult> {
  const user = await requireActiveUser();
  if (!user) {
    return {
      status: "error",
      message: "Du musst angemeldet sein, um eine Testbenachrichtigung zu senden.",
    };
  }

  const supabase = await createClient();

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", user.id)
    .returns<(PushSubscriptionKeys & { id: string })[]>();

  if (error) {
    return {
      status: "error",
      message: "Deine Geräte konnten nicht geladen werden. Bitte versuche es erneut.",
    };
  }

  if (subscriptions.length === 0) {
    return { status: "no_devices" };
  }

  let deliveredCount = 0;
  const expiredIds: string[] = [];

  for (const subscription of subscriptions) {
    const outcome = await sendPushNotification(subscription, TEST_PUSH_PAYLOAD);
    if (outcome.status === "sent") deliveredCount++;
    if (outcome.status === "expired") expiredIds.push(subscription.id);
  }

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds).eq("user_id", user.id);
  }

  if (deliveredCount === 0) {
    return {
      status: "error",
      message: "Die Testbenachrichtigung konnte an keines deiner Geräte gesendet werden.",
    };
  }

  return { status: "sent", deliveredCount };
}
