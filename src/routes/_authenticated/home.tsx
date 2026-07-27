import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Search, Plus, Droplet } from "lucide-react";
import { listPlants, waterPlant, getProfile } from "@/lib/plants.functions";
import { toFa, daysBetween, plantEmoji } from "@/lib/fa";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "خانه • مراقبت آینده گیاه" },
      { name: "description", content: "نمای کلی از گیاهان و نیازهای آبیاری امروز." },
    ],
  }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData({ queryKey: ["plants"], queryFn: () => listPlants() }),
      context.queryClient.ensureQueryData({ queryKey: ["profile"], queryFn: () => getProfile() }),
    ]);
  },
  component: HomePage,
});

function HomePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const waterFn = useServerFn(waterPlant);
  const [q, setQ] = useState("");

  const { data: plants } = useSuspenseQuery({ queryKey: ["plants"], queryFn: () => listPlants() });
  const { data: profile } = useSuspenseQuery({ queryKey: ["profile"], queryFn: () => getProfile() });

  const today = new Date();
  const displayName = profile?.name || "دوست گیاه‌دوست";
  const initial = displayName.trim().charAt(0) || "گ";

  const filtered = plants.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));

  const dueToday = plants.filter((p) => {
    const days = p.watering_interval_days - daysBetween(today, new Date(p.last_watered));
    return days <= 0;
  });
  const overdue = plants.filter((p) => {
    const days = p.watering_interval_days - daysBetween(today, new Date(p.last_watered));
    return days < 0;
  });

  const handleWater = async (id: string) => {
    try {
      await waterFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["plants"] });
      toast.success("آبیاری ثبت شد ✅");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="px-5 pt-6">
      {/* Header */}
      <header className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground text-lg font-bold shadow-soft">
            {initial}
          </div>
          <div>
            <p className="text-base font-bold text-primary">سلام {displayName}</p>
            <p className="text-xs text-muted-foreground">گیاهانت منتظرتن!</p>
          </div>
        </div>
        <button className="grid size-11 place-items-center rounded-full bg-brand-100 text-primary">
          <Bell className="size-5" />
        </button>
      </header>

      {/* Search */}
      <label className="mb-4 flex items-center gap-2 rounded-full border border-border bg-card px-4 py-3 shadow-soft">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="جستجوی گیاه..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
      </label>

      {/* Stats */}
      <div className="mb-6 grid grid-cols-3 gap-3">
        <StatCard label="آبیاری امروز" value={toFa(dueToday.length)} tint="bg-brand-100" />
        <StatCard label="نیازمند آب" value={toFa(overdue.length)} tint="bg-[#FEF3C7]" />
        <StatCard label="تعداد گیاه" value={toFa(plants.length)} tint="bg-brand-100" />
      </div>

      {/* Section title */}
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-bold text-primary">گیاهان من 🌿</h2>
        <button className="text-xs font-medium text-brand-700">مشاهده همه</button>
      </div>

      {/* Plant cards */}
      <div className="mb-6 space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
            هنوز گیاهی اضافه نکردی. با دکمه پایین شروع کن!
          </div>
        )}
        {filtered.map((p) => {
          const daysLeft = p.watering_interval_days - daysBetween(today, new Date(p.last_watered));
          const overdueDays = -daysLeft;
          const isOverdue = daysLeft < 0;
          const pct = Math.max(0, Math.min(100, (daysLeft / p.watering_interval_days) * 100));
          return (
            <div
              key={p.id}
              className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3.5 shadow-soft"
            >
              <div className="grid size-14 place-items-center rounded-2xl bg-brand-100 text-2xl">
                {plantEmoji(p.type)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <p className="truncate font-bold text-primary">{p.name}</p>
                  {p.latin_name && (
                    <p className="truncate text-[11px] text-muted-foreground" dir="ltr">
                      {p.latin_name}
                    </p>
                  )}
                </div>
                <p className="mt-1 flex items-center gap-1.5 text-xs">
                  <span
                    className={`inline-block size-1.5 rounded-full ${isOverdue ? "bg-warn" : "bg-brand-700"}`}
                  />
                  {isOverdue ? (
                    <span className="text-[#B45309]">
                      نیاز به آب! {toFa(overdueDays)} روز تأخیر
                    </span>
                  ) : (
                    <span className="text-muted-foreground">
                      سالم · آبیاری: {toFa(Math.max(0, daysLeft))} روز دیگر
                    </span>
                  )}
                </p>
              </div>
              <Ring pct={pct} overdue={isOverdue} onClick={() => handleWater(p.id)} />
            </div>
          );
        })}
      </div>

      {/* AI banner */}
      <button
        onClick={() => navigate({ to: "/diagnose" })}
        className="mb-8 flex w-full items-center gap-3 rounded-3xl bg-brand-100 p-4 text-right shadow-soft"
      >
        <div className="text-4xl">🤖</div>
        <div className="flex-1">
          <p className="text-sm font-bold text-primary">تشخیص هوشمند گیاه</p>
          <p className="text-xs text-muted-foreground">عکس بگیر، گیاهت رو بشناس</p>
        </div>
        <span className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground">
          امتحان کن
        </span>
      </button>

      {/* FAB */}
      <Link
        to="/add-plant"
        className="fixed bottom-24 left-1/2 z-30 grid size-16 -translate-x-1/2 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft ring-4 ring-background"
      >
        <Plus className="size-7" />
      </Link>
    </div>
  );
}

function StatCard({ label, value, tint }: { label: string; value: string; tint: string }) {
  return (
    <div className={`rounded-2xl ${tint} p-3 text-center`}>
      <p className="text-2xl font-extrabold text-primary fa-num">{value}</p>
      <p className="mt-0.5 text-[11px] text-primary/80">{label}</p>
    </div>
  );
}

function Ring({ pct, overdue, onClick }: { pct: number; overdue: boolean; onClick: () => void }) {
  const r = 20;
  const c = 2 * Math.PI * r;
  const off = c - (pct / 100) * c;
  return (
    <button
      onClick={onClick}
      className="relative grid size-12 place-items-center"
      title="ثبت آبیاری"
    >
      <svg width="48" height="48" className="-rotate-90">
        <circle cx="24" cy="24" r={r} strokeWidth="4" className="fill-none stroke-brand-100" />
        <circle
          cx="24"
          cy="24"
          r={r}
          strokeWidth="4"
          strokeLinecap="round"
          className={`fill-none ${overdue ? "stroke-warn" : "stroke-brand-700"}`}
          strokeDasharray={c}
          strokeDashoffset={off}
        />
      </svg>
      <Droplet className="absolute size-4 text-primary" />
    </button>
  );
}
