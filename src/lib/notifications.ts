// Watering reminders shown as system notifications on this device.
// Settings live in localStorage because notification permission is per browser/device.

import { localIso } from "@/lib/fa";

export type NotifySettings = { enabled: boolean; time: string };

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

/** Sends today's reminder once, after the chosen time, if any plant needs water. */
export async function maybeNotifyDuePlants(duePlantNames: string[], now = new Date()) {
  const settings = readNotifySettings();
  if (!settings.enabled || duePlantNames.length === 0) return;
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
