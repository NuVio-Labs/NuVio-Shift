"use client";

import { useEffect } from "react";

/**
 * Registers the service worker in production only. In development, Next.js
 * rebuilds constantly and a registered worker can end up serving a stale
 * `/sw.js` across restarts, which is a classic source of confusing
 * "why is my change not showing up" bugs — production is also the only
 * place installability actually matters.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker.register("/sw.js").catch(() => {
      // Registration failing (unsupported browser, blocked, etc.) must
      // never break the app — it only means no installable/offline
      // behavior, which the rest of NuVio Shift doesn't depend on.
    });
  }, []);

  return null;
}
