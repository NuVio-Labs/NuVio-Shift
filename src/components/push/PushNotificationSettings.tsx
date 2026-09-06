"use client";

import { useEffect, useState, useTransition } from "react";

import { removePushSubscription, savePushSubscription, sendTestPush } from "@/lib/push/actions";
import { urlBase64ToUint8Array } from "@/lib/push/client";
import { Button } from "@/components/ui/button";

type PushUiState =
  | "checking"
  | "unavailable"
  | "unsupported"
  | "ios-needs-install"
  | "denied"
  | "not_subscribed"
  | "subscribed";

type PushSupportLevel = "unavailable" | "unsupported" | "ios-needs-install" | "supported";

function detectPushSupport(): PushSupportLevel {
  // http://192.168.x.x (a real device on the LAN, e.g. testing on an iPhone
  // during development) is not a secure context — only https: and localhost
  // are. There is nothing a user can do here except switch to HTTPS/PWA, so
  // this is checked before anything else and never involves a wait.
  if (!window.isSecureContext) {
    return "unavailable";
  }

  const isIos = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone =
    window.matchMedia("(display-mode: standalone)").matches ||
    (navigator as unknown as { standalone?: boolean }).standalone === true;

  if (isIos && !isStandalone) {
    return "ios-needs-install";
  }

  const hasApis = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return hasApis ? "supported" : "unsupported";
}

/**
 * Resolves to the active service worker registration, or `null` — never
 * hangs forever. `getRegistration()` alone can race a fresh registration
 * still in flight right after page load, so this also gives
 * `serviceWorker.ready` a bounded window to catch up. In development the
 * service worker is deliberately never registered (see M8), so on
 * localhost this always settles to `null` after the timeout instead of
 * waiting indefinitely.
 */
async function getReadyRegistrationOrNull(timeoutMs = 3000): Promise<ServiceWorkerRegistration | null> {
  const existing = await navigator.serviceWorker.getRegistration();
  if (existing) return existing;

  return new Promise((resolve) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (!settled) {
        settled = true;
        resolve(null);
      }
    }, timeoutMs);

    navigator.serviceWorker.ready.then((registration) => {
      if (!settled) {
        settled = true;
        clearTimeout(timer);
        resolve(registration);
      }
    });
  });
}

export function PushNotificationSettings() {
  const [state, setState] = useState<PushUiState>("checking");
  const [error, setError] = useState<string | null>(null);
  const [testMessage, setTestMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    let cancelled = false;

    async function detect() {
      const support = detectPushSupport();
      if (support !== "supported") {
        if (!cancelled) setState(support);
        return;
      }

      if (Notification.permission === "denied") {
        if (!cancelled) setState("denied");
        return;
      }

      const registration = await getReadyRegistrationOrNull();
      if (!registration) {
        if (!cancelled) setState("unavailable");
        return;
      }

      const subscription = await registration.pushManager.getSubscription();
      if (!cancelled) setState(subscription ? "subscribed" : "not_subscribed");
    }

    detect();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleActivate() {
    setError(null);
    startTransition(async () => {
      const permission = await Notification.requestPermission();
      if (permission === "denied") {
        setState("denied");
        return;
      }
      if (permission !== "granted") {
        return; // user dismissed the prompt — stay on "not_subscribed"
      }

      const registration = await navigator.serviceWorker.ready;
      let subscription = await registration.pushManager.getSubscription();

      try {
        if (!subscription) {
          const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
          if (!publicKey) {
            setError("Benachrichtigungen sind aktuell nicht konfiguriert.");
            return;
          }
          subscription = await registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(publicKey),
          });
        }

        const keys = subscription.toJSON().keys;
        const result = await savePushSubscription({
          endpoint: subscription.endpoint,
          p256dh: keys?.p256dh ?? "",
          auth: keys?.auth ?? "",
        });

        if (result.status === "error") {
          await subscription.unsubscribe();
          setError(result.message);
          return;
        }

        setState("subscribed");
      } catch {
        setError("Benachrichtigungen konnten nicht aktiviert werden. Bitte versuche es erneut.");
      }
    });
  }

  function handleDeactivate() {
    setError(null);
    startTransition(async () => {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (!subscription) {
        setState("not_subscribed");
        return;
      }

      const endpoint = subscription.endpoint;
      await subscription.unsubscribe();

      const result = await removePushSubscription(endpoint);
      if (result.status === "error") {
        setError(result.message);
      }
      setState("not_subscribed");
    });
  }

  function handleTestPush() {
    setError(null);
    setTestMessage(null);
    startTransition(async () => {
      const result = await sendTestPush();
      if (result.status === "error") {
        setError(result.message);
      } else if (result.status === "no_devices") {
        setError("Es ist noch kein Gerät registriert.");
      } else {
        setTestMessage("Testbenachrichtigung wurde gesendet.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {state === "checking" && (
        <p className="text-sm text-muted-foreground">Status wird geprüft…</p>
      )}

      {state === "unsupported" && (
        <p className="text-sm text-muted-foreground">
          Push-Benachrichtigungen werden von diesem Browser nicht unterstützt.
        </p>
      )}

      {state === "unavailable" && (
        <p className="text-sm text-muted-foreground">
          Benachrichtigungen sind in dieser Umgebung aktuell nicht verfügbar.
          Öffne NuVio Shift über HTTPS bzw. als installierte PWA, um sie zu
          aktivieren.
        </p>
      )}

      {state === "ios-needs-install" && (
        <p className="text-sm text-muted-foreground">
          Installiere NuVio Shift zuerst auf deinem Home-Bildschirm und öffne
          die App von dort, um Benachrichtigungen zu aktivieren.
        </p>
      )}

      {state === "denied" && (
        <p className="text-sm text-muted-foreground">
          Benachrichtigungen sind im Browser blockiert. Du kannst sie in den
          Browser-/App-Einstellungen wieder erlauben.
        </p>
      )}

      {(state === "not_subscribed" || state === "subscribed") && (
        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">Status:</p>
          <p className="text-base font-medium text-foreground">
            {state === "subscribed" ? "Aktiv" : "Nicht aktiviert"}
          </p>
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}
      {testMessage && <p className="text-sm text-foreground">{testMessage}</p>}

      {state === "not_subscribed" && (
        <Button onClick={handleActivate} disabled={isPending}>
          {isPending ? "Aktiviere…" : "Benachrichtigungen aktivieren"}
        </Button>
      )}

      {state === "subscribed" && (
        <div className="flex flex-col gap-2">
          <Button onClick={handleTestPush} disabled={isPending}>
            {isPending ? "Sende…" : "Testbenachrichtigung senden"}
          </Button>
          <Button variant="outline" onClick={handleDeactivate} disabled={isPending}>
            Benachrichtigungen deaktivieren
          </Button>
        </div>
      )}
    </div>
  );
}
