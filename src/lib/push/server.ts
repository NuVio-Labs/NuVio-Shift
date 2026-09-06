import webpush, { WebPushError } from "web-push";

let configured = false;

/** Configures web-push's VAPID details exactly once per server process. */
function ensureConfigured() {
  if (configured) return;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type PushSubscriptionKeys = {
  endpoint: string;
  p256dh: string;
  auth: string;
};

export type SendPushOutcome =
  | { status: "sent" }
  | { status: "expired" } // 404/410 — caller should delete the subscription row
  | { status: "failed" };

/**
 * Sends one push message to one subscription. Never throws — a dead or
 * misbehaving device must not stop delivery to a user's other devices.
 */
export async function sendPushNotification(
  subscription: PushSubscriptionKeys,
  payload: unknown,
): Promise<SendPushOutcome> {
  ensureConfigured();

  try {
    await webpush.sendNotification(
      {
        endpoint: subscription.endpoint,
        keys: { p256dh: subscription.p256dh, auth: subscription.auth },
      },
      JSON.stringify(payload),
    );
    return { status: "sent" };
  } catch (error) {
    if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
      return { status: "expired" };
    }

    console.error(
      "Web push delivery failed:",
      error instanceof WebPushError ? error.statusCode : error,
    );
    return { status: "failed" };
  }
}
