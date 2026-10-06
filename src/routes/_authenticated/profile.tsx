import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { LogOut, User as UserIcon, Bell, Sprout, Droplet, CalendarDays, Flame } from "lucide-react";
import { listPlants, getProfile, getWateringStats } from "@/lib/plants.functions";
import { supabase } from "@/integrations/supabase/client";
import { toFa, daysBetween, wateringStreak, addressName } from "@/lib/fa";
import { toLocalMobile } from "@/lib/phone";
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
      context.queryClient.ensureQueryData({
        queryKey: ["waterings"],
        queryFn: () => getWateringStats(),
      }),
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
  const { data: waterings } = useSuspenseQuery({
    queryKey: ["waterings"],
    queryFn: () => getWateringStats(),
  });
  const { user } = Route.useRouteContext();

  const displayName = addressName(profile, "کاربر");
  const initial = displayName.trim().charAt(0) || "گ";
  // Phone-only accounts have no email; show their number instead.
  const email = user.email || (user.phone ? toLocalMobile(user.phone) : "");

  // Real count from the history table; rough estimate until that table exists.
  const wateringsDone = waterings.available
    ? waterings.total
    : plants.reduce(
        (sum, p) =>
          sum +
          Math.floor(daysBetween(new Date(), new Date(p.created_at)) / p.watering_interval_days),
        0,
      );
  const streak = wateringStreak(waterings.dates);
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
    <div className="px-4 pt-[18px]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <BackButton onClick={() => navigate({ to: "/home" })} />
        <Segmented value="overview" options={[{ value: "overview", label: "پروفایل" }]} />
      </header>

      <div className="glass-card mb-3.5 flex items-center gap-3.5 rounded-[30px] p-4">
        <div className="grid size-16 shrink-0 place-items-center rounded-[22px] border-2 border-white bg-gradient-to-br from-[#E4F3E7] to-[#CDE8D3] text-[26px] font-extrabold text-[#23573A] shadow-soft">
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
          icon={<Sprout className="size-5" />}
          title="تعداد گیاه"
          value={toFa(plants.length)}
          unit="گیاه"
          label="در باغچه"
        />
        <Tile
          tone="peach"
          icon={<Droplet className="size-5 text-warn-ink" />}
          title="آبیاری‌ها"
          value={toFa(wateringsDone)}
          unit="بار"
          label={waterings.available ? "از روز اول" : "تخمینی"}
        />
        <Tile
          tone="rose"
          icon={<CalendarDays className="size-5 text-[#C2566B]" />}
          title="روز استفاده"
          value={toFa(daysUsing)}
          unit="روز"
          label="با گلدون"
        />
        <Tile
          tone="cream"
          icon={<Flame className="size-5 text-warn" />}
          title="پشت‌سرهم"
          value={toFa(streak)}
          unit="روز"
          label="آبیاری بدون وقفه"
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
        <Row
          tone="peach"
          icon={<Bell className="size-4" />}
          label="اعلان‌ها"
          onClick={() => navigate({ to: "/notifications" })}
        />
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
  icon: React.ReactNode;
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
          ? "!border-[1.5px] !border-[#BFE0C9] !bg-gradient-to-br from-[#EEF7F0] to-card"
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
