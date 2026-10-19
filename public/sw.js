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

// Offline: when a page can't be loaded (no internet), show a short friendly page instead of the
// browser's error. Nothing is cached, so the app is never stale.
const OFFLINE_HTML = `<!doctype html><html lang="fa" dir="rtl"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1"><title>Goldoon</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#F4F8F3;color:#1f3b2c;font-family:system-ui,sans-serif;text-align:center;padding:24px}
h1{font-size:22px;margin:0 0 8px}p{margin:0 0 20px;color:#5b6f63;line-height:1.8}
button{border:0;border-radius:999px;background:#3A8A5C;color:#fff;padding:12px 28px;font-size:15px;font-weight:600}</style></head>
<body><main><h1>اینترنت قطعه 🌿</h1><p>گلدون برای باز شدن به اینترنت نیاز داره.<br>وقتی وصل شدی دوباره امتحان کن.</p>
<button onclick="location.reload()">تلاش دوباره</button></main></body></html>`;

self.addEventListener("fetch", (event) => {
  if (event.request.mode !== "navigate") return;
  event.respondWith(
    fetch(event.request).catch(
      () =>
        new Response(OFFLINE_HTML, {
          status: 503,
          headers: { "content-type": "text/html; charset=utf-8" },
        }),
    ),
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
