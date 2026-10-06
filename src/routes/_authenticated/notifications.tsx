import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Bell, BellOff, Clock } from "lucide-react";
import { toast } from "sonner";
import { BackButton, IconBubble, Segmented } from "@/components/garden-ui";
import {
  notificationsSupported,
  readNotifySettings,
  saveNotifySettings,
  showNotification,
  type NotifySettings,
} from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({
    meta: [
      { title: "Goldoon" },
      { name: "description", content: "یادآور آبیاری روی همین دستگاه." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<NotifySettings>({ enabled: false, time: "09:00" });
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">("default");

  useEffect(() => {
    setSettings(readNotifySettings());
    setPermission(notificationsSupported() ? Notification.permission : "unsupported");
  }, []);

  const update = (next: NotifySettings) => {
    setSettings(next);
    saveNotifySettings(next);
  };

  const toggle = async () => {
    if (settings.enabled) {
      update({ ...settings, enabled: false });
      toast.success("یادآور خاموش شد");
      return;
    }
    if (!notificationsSupported()) {
      toast.error("این مرورگر اعلان رو پشتیبانی نمی‌کنه");
      return;
    }
    const result =
      Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
    setPermission(result);
    if (result !== "granted") {
      toast.error("اجازهٔ اعلان داده نشد. از تنظیمات مرورگر فعالش کن.");
      return;
    }
    update({ ...settings, enabled: true });
    toast.success("یادآور روشن شد");
  };

  const test = async () => {
    const ok = await showNotification("Goldoon", "اعلان‌ها درست کار می‌کنن!");
    if (!ok) toast.error("اول یادآور رو روشن کن");
  };

  const blocked = permission === "denied";

  return (
    <div className="px-4 pt-[18px]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <BackButton onClick={() => navigate({ to: "/profile" })} />
        <Segmented value="n" options={[{ value: "n", label: "اعلان‌ها" }]} />
      </header>
      <h1 className="mb-3.5 text-2xl font-extrabold">یادآور آبیاری</h1>

      <div className="glass-card mb-3.5 rounded-[30px] p-4">
        <div className="flex items-center gap-3">
          <IconBubble tone={settings.enabled ? "mint" : "cream"}>
            {settings.enabled ? <Bell className="size-5" /> : <BellOff className="size-5" />}
          </IconBubble>
          <div className="min-w-0 flex-1">
            <p className="text-[15px] font-bold">اعلان روزانه</p>
            <p className="text-xs text-muted-foreground">
              {settings.enabled ? "روشن روی همین دستگاه" : "خاموش"}
            </p>
          </div>
          <button
            role="switch"
            aria-checked={settings.enabled}
            aria-label="اعلان روزانه"
            onClick={toggle}
            className={`relative h-8 w-14 shrink-0 rounded-full transition ${
              settings.enabled ? "bg-primary" : "bg-hatch"
            }`}
          >
            <span
              className={`absolute top-1 size-6 rounded-full bg-white shadow-soft transition-all ${
                settings.enabled ? "right-7" : "right-1"
              }`}
            />
          </button>
        </div>

        <label className="mt-4 flex items-center gap-3 border-t border-dashed border-input pt-4">
          <IconBubble tone="peach">
            <Clock className="size-5" />
          </IconBubble>
          <span className="flex-1 text-sm font-semibold">ساعت یادآوری</span>
          <input
            type="time"
            dir="ltr"
            value={settings.time}
            onChange={(e) => update({ ...settings, time: e.target.value || "09:00" })}
            className="rounded-2xl border border-input bg-white px-3 py-2 text-sm outline-none focus:border-primary"
          />
        </label>
      </div>

      {blocked && (
        <p className="mb-3.5 rounded-3xl bg-warn-soft p-3.5 text-xs leading-6 text-warn-ink">
          اعلان‌ها توی تنظیمات مرورگر مسدود شدن. از آیکون قفل کنار آدرس سایت، اجازهٔ «Notifications»
          رو روشن کن و دوباره امتحان کن.
        </p>
      )}

      <button
        onClick={test}
        className="mb-3.5 w-full rounded-full bg-night py-3.5 text-sm font-semibold text-white"
      >
        ارسال اعلان آزمایشی
      </button>

      <p className="mb-6 rounded-3xl bg-brand-100 p-3.5 text-xs leading-6">
        هر روز بعد از ساعتی که انتخاب کردی، اگه گیاهی آب بخواد یک اعلان می‌گیری. اعلان وقتی می‌آد که
        گلدون توی مرورگر یا به‌صورت برنامهٔ نصب‌شده باز باشه (حتی پشت برنامه‌های دیگه).
      </p>
    </div>
  );
}
