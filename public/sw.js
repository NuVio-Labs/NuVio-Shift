// NuVio Shift — Service Worker (M8 PWA foundation + M9 push foundation)
//
// Still no fetch handler and no caching of any kind — Auth, Supabase
// requests, and /app data must always go straight to the network.
// M10 will start sending real shift-change pushes through this same
// `push` handler; M9 only exercises it via the test-push button.

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    // Missing or non-JSON payload — fall back to the defaults below
    // instead of throwing and dropping the notification entirely.
  }

  const title = data.title || "NuVio Shift";
  const options = {
    body: data.body || "",
    icon: "/icon-192.png",
    badge: "/icon-192.png",
    data: { url: data.url || "/app" },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data && event.notification.data.url
    ? event.notification.data.url
    : "/app";

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });

      const targetAbsoluteUrl = new URL(targetUrl, self.location.origin).href;

      for (const client of allClients) {
        if (new URL(client.url).origin !== self.location.origin) continue;
        if ("focus" in client) {
          await client.focus();
          if ("navigate" in client) {
            await client.navigate(targetAbsoluteUrl);
          }
          return;
        }
      }

      await self.clients.openWindow(targetAbsoluteUrl);
    })(),
  );
});
