import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, User as UserIcon, Bell, Languages } from "lucide-react";
import { listPlants, getProfile } from "@/lib/plants.functions";
import { supabase } from "@/integrations/supabase/client";
import { toFa, daysBetween } from "@/lib/fa";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "پروفایل • مراقبت آینده گیاه" },
      { name: "description", content: "اطلاعات حساب و تنظیمات." },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["plants"], queryFn: () => listPlants() }),
      context.queryClient.ensureQueryData({ queryKey: ["profile"], queryFn: () => getProfile() }),
    ]);
  },
  component: ProfilePage,
});

function ProfilePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery({ queryKey: ["profile"], queryFn: () => getProfile() });
  const { data: plants } = useSuspenseQuery({ queryKey: ["plants"], queryFn: () => listPlants() });

  const displayName = profile?.name || "کاربر";
  const initial = displayName.trim().charAt(0) || "گ";
  const email = (profile as { email?: string } | null)?.email ?? "";

  const wateringsDone = plants.reduce(
    (sum, p) => sum + Math.floor(daysBetween(new Date(), new Date(p.created_at)) / p.watering_interval_days),
    0,
  );
  const daysUsing = profile?.created_at
    ? Math.max(1, daysBetween(new Date(), new Date(profile.created_at)))
    : 1;

  const signOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    toast.success("خارج شدی");
    navigate({ to: "/auth", replace: true });
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="mb-6 text-center text-lg font-bold text-primary">پروفایل</h1>

      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="grid size-24 place-items-center rounded-full bg-primary text-4xl font-bold text-primary-foreground shadow-soft">
          {initial}
        </div>
        <div className="text-center">
          <p className="text-lg font-bold text-primary">{displayName}</p>
          {email && <p className="text-xs text-muted-foreground" dir="ltr">{email}</p>}
        </div>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-3">
        <Stat value={toFa(plants.length)} label="تعداد گیاه" />
        <Stat value={toFa(daysUsing)} label="روز استفاده" />
        <Stat value={toFa(wateringsDone)} label="آبیاری‌ها" />
      </div>

      <div className="mb-4 space-y-2 rounded-2xl border border-border bg-card p-2 shadow-soft">
        <Row icon={<UserIcon className="size-4" />} label="اطلاعات حساب" />
        <Row icon={<Bell className="size-4" />} label="اعلان‌ها" />
        <Row icon={<Languages className="size-4" />} label="زبان برنامه" />
      </div>

      <button
        onClick={signOut}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-destructive/30 bg-card p-3.5 text-sm font-semibold text-destructive shadow-soft"
      >
        <LogOut className="size-4" />
        خروج از حساب
      </button>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-2xl bg-brand-100 p-3 text-center">
      <p className="text-xl font-extrabold text-primary fa-num">{value}</p>
      <p className="mt-0.5 text-[11px] text-primary/80">{label}</p>
    </div>
  );
}

function Row({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <button className="flex w-full items-center gap-3 rounded-xl p-3 text-right transition hover:bg-brand-100">
      <span className="grid size-9 place-items-center rounded-full bg-brand-100 text-primary">
        {icon}
      </span>
      <span className="flex-1 text-sm font-medium text-primary">{label}</span>
      <span className="text-muted-foreground">‹</span>
    </button>
  );
}
