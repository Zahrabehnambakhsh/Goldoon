import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { BottomNav } from "@/components/bottom-nav";
import { listPlants } from "@/lib/plants.functions";
import { daysBetween } from "@/lib/fa";
import { maybeNotifyDuePlants, registerServiceWorker } from "@/lib/notifications";

export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
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

/** While the app is open, checks every 15 minutes whether today's reminder is due. */
function useWateringNotifier() {
  const { data: plants } = useQuery({ queryKey: ["plants"], queryFn: () => listPlants() });

  useEffect(() => {
    registerServiceWorker();
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
