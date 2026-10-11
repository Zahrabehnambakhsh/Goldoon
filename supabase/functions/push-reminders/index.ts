// Sends the daily "time to water" push notification. Called every 15 minutes by pg_cron
// (see migrations/20261012090000_push_subscriptions.sql); each device gets at most one per day,
// after the time its owner picked, and only when at least one plant needs water.
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import webpush from "npm:web-push@3.6.7";

type Sub = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  notify_time: string;
  timezone: string;
  last_sent_on: string | null;
};

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

/** Local date (YYYY-MM-DD) and minutes since midnight in the device's time zone. */
function localNow(timezone: string, now: Date) {
  let tz = timezone;
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    tz = "Asia/Tehran";
  }
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(now)
      .map((p) => [p.type, p.value]),
  );
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    minutes: Number(parts.hour) * 60 + Number(parts.minute),
  };
}

const dayNumber = (iso: string) => Math.floor(Date.parse(`${iso}T00:00:00Z`) / 86_400_000);

Deno.serve(async (req) => {
  const { data: secrets, error: secretsError } = await supabase
    .from("app_secrets")
    .select("name, value");
  if (secretsError) return new Response(secretsError.message, { status: 500 });
  const secret = Object.fromEntries((secrets ?? []).map((s) => [s.name, s.value]));
  if (!secret.cron_secret || req.headers.get("x-cron-secret") !== secret.cron_secret) {
    return new Response("forbidden", { status: 403 });
  }
  webpush.setVapidDetails(
    secret.vapid_subject ?? "mailto:zahrabehnambakhsh97@gmail.com",
    secret.vapid_public_key,
    secret.vapid_private_key,
  );

  const body = await req.json().catch(() => ({}));
  const now = new Date();
  const { data: subs, error } = await supabase.from("push_subscriptions").select("*");
  if (error) return new Response(error.message, { status: 500 });

  // Only devices whose reminder time has passed today and that haven't been notified yet.
  const ready = (subs as Sub[])
    .map((s) => ({ ...s, local: localNow(s.timezone, now) }))
    .filter((s) => {
      if (body.test_endpoint) return s.endpoint === body.test_endpoint;
      const [h, m] = s.notify_time.split(":").map(Number);
      return s.last_sent_on !== s.local.date && s.local.minutes >= h * 60 + m;
    });

  const userIds = [...new Set(ready.map((s) => s.user_id))];
  const { data: plants } = userIds.length
    ? await supabase
        .from("plants")
        .select("user_id, name, watering_interval_days, last_watered")
        .in("user_id", userIds)
    : { data: [] };

  const results: Record<string, string> = {};
  for (const s of ready) {
    const due = (plants ?? [])
      .filter(
        (p) =>
          p.user_id === s.user_id &&
          p.watering_interval_days - (dayNumber(s.local.date) - dayNumber(p.last_watered)) <= 0,
      )
      .map((p) => p.name);
    if (due.length === 0 && !body.test_endpoint) continue;

    const names = due.slice(0, 3).join("، ");
    const more = due.length > 3 ? ` و ${due.length - 3} گیاه دیگه` : "";
    const payload = JSON.stringify({
      title: "وقت آبیاریه 💧",
      body: due.length
        ? `${names}${more} امروز آب می‌خوان. برو بهشون آب بده!`
        : "اعلان‌های گلدون درست کار می‌کنن.",
      url: "/reminders",
    });
    try {
      await webpush.sendNotification(
        { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
        payload,
        { TTL: 6 * 60 * 60, urgency: "high" },
      );
      await supabase
        .from("push_subscriptions")
        .update({ last_sent_on: s.local.date })
        .eq("id", s.id);
      results[s.id] = "sent";
    } catch (err) {
      const status = (err as { statusCode?: number }).statusCode;
      // The browser dropped this subscription (app removed, permission revoked).
      if (status === 404 || status === 410) {
        await supabase.from("push_subscriptions").delete().eq("id", s.id);
        results[s.id] = "removed";
      } else {
        results[s.id] = `error ${status ?? ""} ${(err as Error).message}`;
      }
    }
  }

  return Response.json({ checked: subs?.length ?? 0, ready: ready.length, results });
});
