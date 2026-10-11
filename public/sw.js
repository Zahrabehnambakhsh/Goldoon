// Minimal service worker: shows Goldoon notifications (local and push) and opens the app when one is tapped.
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

// Daily watering reminder sent by the push-reminders edge function, even when the app is closed.
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { body: event.data ? event.data.text() : "" };
  }
  event.waitUntil(
    self.registration.showNotification(data.title || "Goldoon", {
      body: data.body || "وقت آبیاریه!",
      icon: "/icon-192.png?v=3",
      badge: "/icon-192.png?v=3",
      tag: "goldoon-watering",
      data: { url: data.url || "/reminders" },
      dir: "rtl",
      lang: "fa",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "/reminders", self.location.origin).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const client of list) {
        if ("focus" in client) {
          client.navigate(target);
          return client.focus();
        }
      }
      return self.clients.openWindow(target);
    }),
  );
});
