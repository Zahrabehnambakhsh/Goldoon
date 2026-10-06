import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, User as UserIcon, Bell, Languages } from "lucide-react";
import { listPlants, getProfile } from "@/lib/plants.functions";
import { supabase } from "@/integrations/supabase/client";
import { toFa, daysBetween } from "@/lib/fa";
import { toast } from "sonner";
import { BackButton, BigStat, IconBubble, Segmented } from "@/components/garden-ui";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "پروفایل • Goldoon" },
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
  const { data: profile } = useSuspenseQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
  });
  const { data: plants } = useSuspenseQuery({ queryKey: ["plants"], queryFn: () => listPlants() });

  const displayName = profile?.name || "کاربر";
  const initial = displayName.trim().charAt(0) || "گ";
  const email = (profile as { email?: string } | null)?.email ?? "";

  const wateringsDone = plants.reduce(
    (sum, p) =>
      sum + Math.floor(daysBetween(new Date(), new Date(p.created_at)) / p.watering_interval_days),
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

  const healthy = plants.filter(
    (p) => p.watering_interval_days - daysBetween(new Date(), new Date(p.last_watered)) >= 0,
  ).length;

  return (
    <div className="px-4 pt-[18px]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <BackButton onClick={() => navigate({ to: "/home" })} />
        <Segmented value="overview" options={[{ value: "overview", label: "پروفایل" }]} />
      </header>

      <div className="glass-card mb-3.5 flex items-center gap-3.5 rounded-[30px] p-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-[22px] border-2 border-white bg-gradient-to-br from-[#F5D9B8] to-[#E9BE95] text-[26px] font-extrabold text-[#6B3B12] shadow-soft">
          {initial}
        </div>
        <div className="min-w-0">
          <p className="truncate text-lg font-extrabold">{displayName}</p>
          {email && (
            <p className="truncate text-right text-xs text-muted-foreground" dir="ltr">
              {email}
            </p>
          )}
        </div>
      </div>

      <h2 className="mx-1 mb-3 text-lg font-extrabold">نمای کلی</h2>
      <div className="mb-3.5 grid grid-cols-2 gap-3">
        <Tile
          tone="mint"
          icon="🪴"
          title="تعداد گیاه"
          value={toFa(plants.length)}
          unit="گیاه"
          label="در باغچه"
        />
        <Tile
          tone="peach"
          icon="💧"
          title="آبیاری‌ها"
          value={toFa(wateringsDone)}
          unit="بار"
          label="تخمین از روز اول"
        />
        <Tile
          tone="rose"
          icon="📅"
          title="روز استفاده"
          value={toFa(daysUsing)}
          unit="روز"
          label="با گلدون"
        />
        <Tile
          tone="cream"
          icon="🌿"
          title="گیاه سالم"
          value={toFa(healthy)}
          unit="گیاه"
          label="آبیاری به‌موقع"
          highlight
        />
      </div>

      <div className="glass-card mb-3.5 grid rounded-[30px] p-1.5">
        <Row
          tone="mint"
          icon={<UserIcon className="size-4" />}
          label="اطلاعات حساب"
          onClick={() => navigate({ to: "/account" })}
        />
        <Row tone="peach" icon={<Bell className="size-4" />} label="اعلان‌ها" />
        <Row tone="lilac" icon={<Languages className="size-4" />} label="زبان برنامه" />
      </div>

      <button
        onClick={signOut}
        className="mb-6 flex w-full items-center justify-center gap-2 rounded-[20px] border border-destructive/25 bg-card p-3.5 text-sm font-bold text-destructive shadow-soft"
      >
        <LogOut className="size-4" />
        خروج از حساب
      </button>
    </div>
  );
}

function Tile({
  tone,
  icon,
  title,
  value,
  unit,
  label,
  highlight,
}: {
  tone: "mint" | "peach" | "rose" | "cream";
  icon: string;
  title: string;
  value: string;
  unit: string;
  label: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`glass-card flex flex-col gap-3.5 rounded-3xl p-3.5 ${
        highlight
          ? "!border-[1.5px] !border-[#CBB79A] !bg-gradient-to-br from-[#FBF1E2] to-card"
          : ""
      }`}
    >
      <div className="flex items-center gap-2 text-[13px] font-semibold leading-tight">
        <IconBubble tone={tone}>{icon}</IconBubble>
        {title}
      </div>
      <BigStat value={value} unit={unit} label={label} />
    </div>
  );
}

function Row({
  tone,
  icon,
  label,
  onClick,
}: {
  tone: "mint" | "peach" | "lilac";
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-[18px] p-2.5 text-right transition hover:bg-foreground/[0.04]"
    >
      <IconBubble tone={tone}>{icon}</IconBubble>
      <span className="flex-1 text-sm font-semibold">{label}</span>
      <span className="text-muted-foreground">‹</span>
    </button>
  );
}
