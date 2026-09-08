import { createServiceRoleClient } from "@/lib/supabase/service";
import { sendPushNotification, type PushSubscriptionKeys } from "@/lib/push/server";

export type PushPayload = {
  title: string;
  body: string;
  url: string;
};

/**
 * Sends a push notification to every device of one user.
 *
 * Deliberately NOT a Server Action — this file has no "use server"
 * directive, so it can only ever be called from other server-side code
 * (e.g. the shift assignment actions), never invoked directly from the
 * client. The scheduler must never be able to push to an arbitrary user;
 * this only runs as a side effect of an already-authorized shift mutation,
 * with the recipient derived server-side from that mutation.
 *
 * Uses the service-role client because the caller (typically a scheduler
 * notifying a different employee) has no RLS access to that employee's
 * `push_subscriptions` — and that stays true; RLS is not loosened for this.
 */
export async function sendPushToUser(userId: string, payload: PushPayload): Promise<void> {
  const supabase = createServiceRoleClient();

  const { data: subscriptions, error } = await supabase
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("user_id", userId)
    .returns<(PushSubscriptionKeys & { id: string })[]>();

  if (error) {
    console.error("Failed to load push subscriptions for notification:", error.message);
    return;
  }

  if (subscriptions.length === 0) {
    return;
  }

  const expiredIds: string[] = [];

  for (const subscription of subscriptions) {
    const outcome = await sendPushNotification(subscription, payload);
    if (outcome.status === "expired") expiredIds.push(subscription.id);
  }

  if (expiredIds.length > 0) {
    await supabase.from("push_subscriptions").delete().in("id", expiredIds);
  }
}
