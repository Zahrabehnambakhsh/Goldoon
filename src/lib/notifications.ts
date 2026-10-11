// Watering reminders shown as system notifications on this device.
// Settings live in localStorage because notification permission is per browser/device.

import { supabase } from "@/integrations/supabase/client";
import { localIso } from "@/lib/fa";

// Public half of the VAPID key pair; the private half lives only in Supabase (app_secrets).
const VAPID_PUBLIC_KEY =
  "BDbvLDUFnwzLpeko3AhKZAy1JNL-Gwftres-3c1xWOo2BkSTOe5bBX9PYJbpggyctFa2sijXK7yb7D1i7Wc6vnw";

/** `push`: this device is subscribed to server push, so the in-app check stays quiet. */
export type NotifySettings = { enabled: boolean; time: string; push?: boolean };

const SETTINGS_KEY = "goldoon-notify";
const LAST_KEY = "goldoon-notify-last";
const DEFAULTS: NotifySettings = { enabled: false, time: "09:00" };

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

export function readNotifySettings(): NotifySettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    // storage blocked: fall back to defaults
  }
  return DEFAULTS;
}

export function saveNotifySettings(s: NotifySettings) {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  try {
    return await navigator.serviceWorker.register("/sw.js");
  } catch {
    return null;
  }
}

export async function showNotification(title: string, body: string, url = "/reminders") {
  if (!notificationsSupported() || Notification.permission !== "granted") return false;
  const options: NotificationOptions = {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "goldoon-watering",
    data: { url },
    dir: "rtl",
    lang: "fa",
  };
  const reg = await registerServiceWorker();
  if (reg) {
    await reg.showNotification(title, options);
  } else {
    new Notification(title, options);
  }
  return true;
}

/** True when this browser can get reminders while Goldoon is closed (web push). */
export function pushSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    notificationsSupported()
  );
}

function keyBytes(base64url: string): Uint8Array<ArrayBuffer> {
  const b64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4))
    .replace(/-/g, "+")
    .replace(/_/g, "/");
  const raw = atob(b64);
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/**
 * Subscribes this device to push reminders and stores the subscription with the chosen time,
 * so the server can notify even when the app is closed. Returns false if push isn't available.
 */
export async function enablePush(time: string): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await registerServiceWorker();
  if (!reg) return false;
  await navigator.serviceWorker.ready;
  let sub = await reg.pushManager.getSubscription();
  if (!sub) {
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: keyBytes(VAPID_PUBLIC_KEY),
    });
  }
  const json = sub.toJSON();
  const { data } = await supabase.auth.getUser();
  if (!data.user || !json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return false;
  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: data.user.id,
      endpoint: json.endpoint,
      p256dh: json.keys.p256dh,
      auth: json.keys.auth,
      notify_time: time,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Tehran",
    },
    { onConflict: "endpoint" },
  );
  return !error;
}

/** Stops push reminders on this device. */
export async function disablePush() {
  if (!pushSupported()) return;
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subscriptions").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

/** Sends today's reminder once, after the chosen time, if any plant needs water. */
export async function maybeNotifyDuePlants(duePlantNames: string[], now = new Date()) {
  const settings = readNotifySettings();
  // Devices with push get the reminder from the server instead (also when the app is closed).
  if (!settings.enabled || settings.push || duePlantNames.length === 0) return;
  const [h, m] = settings.time.split(":").map(Number);
  if (now.getHours() * 60 + now.getMinutes() < h * 60 + (m || 0)) return;

  const today = localIso(now);
  try {
    if (localStorage.getItem(LAST_KEY) === today) return;
  } catch {
    return;
  }

  const names = duePlantNames.slice(0, 3).join("، ");
  const more = duePlantNames.length > 3 ? ` و ${duePlantNames.length - 3} گیاه دیگه` : "";
  const sent = await showNotification("وقت آبیاریه", `${names}${more} منتظر آب هستن.`);
  if (sent) {
    try {
      localStorage.setItem(LAST_KEY, today);
    } catch {
      // ignore
    }
  }
}
