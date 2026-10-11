import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { getProfile, listPlants } from "@/lib/plants.functions";
import { daysBetween } from "@/lib/fa";
import {
  enablePush,
  maybeNotifyDuePlants,
  readNotifySettings,
  registerServiceWorker,
  saveNotifySettings,
} from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async ({ context }) => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });

    // First login: ask what to call them before anything else. Only when the column exists,
    // so the app keeps working before the display_name migration has run.
    const profile = await context.queryClient.ensureQueryData({
      queryKey: ["profile"],
      queryFn: () => getProfile(),
    });
    if (profile && "display_name" in profile && !profile.display_name) {
      throw redirect({ to: "/welcome" });
    }
    return { user: data.user };
  },
  component: AuthedLayout,
});

function AuthedLayout() {
  useWateringNotifier();
  return (
    <div className="relative min-h-screen pb-[120px]">
      <Outlet />
      <BottomNav />
    </div>
  );
}

/** Push reminders come from the server; without push, checks every 15 minutes while the app is open. */
function useWateringNotifier() {
  const { data: plants } = useQuery({ queryKey: ["plants"], queryFn: () => listPlants() });

  useEffect(() => {
    registerServiceWorker();
    // Keep this device's push subscription fresh (also upgrades older in-app-only reminders).
    const settings = readNotifySettings();
    if (settings.enabled && "Notification" in window && Notification.permission === "granted") {
      enablePush(settings.time)
        .catch(() => false)
        .then((push) => saveNotifySettings({ ...readNotifySettings(), push }));
    }
  }, []);

  useEffect(() => {
    if (!plants) return;
    const check = () => {
      const today = new Date();
      const due = plants
        .filter((p) => p.watering_interval_days - daysBetween(today, new Date(p.last_watered)) <= 0)
        .map((p) => p.name);
      maybeNotifyDuePlants(due);
    };
    check();
    const timer = setInterval(check, 15 * 60 * 1000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", check);
    };
  }, [plants]);
}
