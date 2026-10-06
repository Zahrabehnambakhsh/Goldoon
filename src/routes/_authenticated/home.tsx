import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Bell, Search, Plus, Droplet, Leaf, BarChart3, ChevronLeft } from "lucide-react";
import { listPlants, waterPlant, getProfile, getWateringStats } from "@/lib/plants.functions";
import { toFa, daysBetween, plantEmoji, localIso, wateringStreak, addressName } from "@/lib/fa";
import { Foliage } from "@/components/foliage";
import { SquareButton, BigStat } from "@/components/garden-ui";
import { toast } from "sonner";
import { useState } from "react";

export const Route = createFileRoute("/_authenticated/home")({
  head: () => ({
    meta: [
      { title: "خانه • Goldoon" },
      { name: "description", content: "نمای کلی از گیاهان و نیازهای آبیاری امروز." },
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
  component: HomePage,
});

const TYPE_FA: Record<string, string> = {
  indoor: "آپارتمانی",
  garden: "باغی",
  cactus: "کاکتوس",
  aquatic: "آبزی",
};
const LIGHT_FA: Record<string, string> = { low: "نور کم", medium: "نور متوسط", high: "نور زیاد" };
const DAY_SHORT = ["ی", "د", "س", "چ", "پ", "ج", "ش"]; // indexed by Date.getDay()

function HomePage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const waterFn = useServerFn(waterPlant);
  const [q, setQ] = useState("");

  const { data: plants } = useSuspenseQuery({ queryKey: ["plants"], queryFn: () => listPlants() });
  const { data: profile } = useSuspenseQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
  });
  const { data: waterings } = useSuspenseQuery({
    queryKey: ["waterings"],
    queryFn: () => getWateringStats(),
  });

  const today = new Date();
  const displayName = addressName(profile, "دوست گیاه‌دوست");
  const initial = displayName.trim().charAt(0) || "گ";
  const daysUsing = profile?.created_at
    ? Math.max(1, daysBetween(today, new Date(profile.created_at)))
    : 1;
  const streak = wateringStreak(waterings.dates, today);
  const isEmpty = plants.length === 0;

  const withLeft = plants
    .map((p) => ({
      ...p,
      daysLeft: p.watering_interval_days - daysBetween(today, new Date(p.last_watered)),
    }))
    .sort((a, b) => a.daysLeft - b.daysLeft);
  const filtered = withLeft.filter((p) => p.name.toLowerCase().includes(q.toLowerCase()));
  const dueToday = withLeft.filter((p) => p.daysLeft <= 0);

  // This week (Saturday first): past days show real waterings, today shows what's due,
  // later days show what's planned.
  const weekday = (today.getDay() + 1) % 7;
  const week = Array.from({ length: 7 }, (_, k) => {
    const off = k - weekday;
    const d = new Date(today);
    d.setDate(d.getDate() + off);
    const key = localIso(d);
    const count =
      off < 0
        ? waterings.dates.filter((x) => x === key).length
        : withLeft.filter((p) => (off === 0 ? p.daysLeft <= 0 : p.daysLeft === off)).length;
    return { off, label: DAY_SHORT[d.getDay()], count };
  });
  const maxCount = Math.max(3, ...week.map((w) => w.count));

  const handleWater = async (id: string) => {
    try {
      await waterFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["plants"] });
      qc.invalidateQueries({ queryKey: ["waterings"] });
      toast.success("آبیاری ثبت شد 💧");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  return (
    <div className="px-4 pt-[18px]">
      {/* Top bar */}
      <header className="mb-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="grid size-[46px] place-items-center rounded-2xl border-2 border-white bg-gradient-to-br from-[#F5D9B8] to-[#E9BE95] text-lg font-extrabold text-[#6B3B12] shadow-soft">
            {initial}
          </div>
          <div className="flex items-center gap-1.5 text-lg font-bold">
            <span className="grid size-5 place-items-center rounded-full bg-brand-900 text-white">
              <Leaf className="size-3" />
            </span>
            <span className="fa-num">{toFa(plants.length)}</span>
            <span className="text-xs font-medium text-muted-foreground">گیاه</span>
          </div>
        </div>
        <SquareButton label="یادآورها" onClick={() => navigate({ to: "/reminders" })}>
          <Bell className="size-5" />
        </SquareButton>
      </header>

      {/* Hero */}
      <section className="hero-sand relative mb-3.5 flex min-h-[330px] flex-col overflow-hidden rounded-[34px] px-5 pt-[22px]">
        <Foliage />
        <h1 className="relative text-[30px] font-extrabold leading-tight">سلام، {displayName}</h1>
        <p className="relative mt-1.5 max-w-[210px] text-[15px] leading-relaxed">
          {isEmpty ? "باغچه‌ات هنوز خالیه؛ بیا اولین گیاهت رو بکاریم." : "گیاهانت منتظرتن!"}
        </p>
        <div
          className={`absolute left-[18px] top-[22px] flex items-center gap-1.5 rounded-[18px] bg-[#FCF6EC]/95 px-3.5 py-2 text-xl font-extrabold shadow-soft fa-num ${
            isEmpty ? "hidden" : ""
          }`}
        >
          {streak > 0 ? "🔥" : "🌱"} {toFa(streak > 0 ? streak : daysUsing)}
          <span className="text-[11px] font-medium text-muted-foreground">
            {streak > 0 ? "روز پشت‌سرهم" : "روز با گلدون"}
          </span>
        </div>
        <span
          aria-hidden="true"
          className="pointer-events-none absolute left-[34px] top-[88px] text-[104px] leading-none drop-shadow-[0_16px_18px_rgba(60,40,10,0.25)]"
        >
          🪴
        </span>

        <div className="relative -mx-5 mt-auto rounded-t-[28px] rounded-b-[32px] border-t border-white/90 bg-[#FBF0DE]/95 px-5 pb-[18px] pt-4">
          {isEmpty ? (
            <div className="flex flex-col gap-3">
              <h2 className="text-base font-bold">اولین قدم 🌱</h2>
              <Link
                to="/add-plant"
                className="flex h-[52px] items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground shadow-soft transition hover:bg-brand-900"
              >
                <Plus className="size-5" />
                افزودن اولین گیاه
              </Link>
            </div>
          ) : (
            <>
              <div className="mb-3 flex items-center justify-between">
                <h2 className="flex items-center gap-2 text-base font-bold">
                  <Droplet className="size-4" />
                  وضعیت امروز
                </h2>
                <Link
                  to="/add-plant"
                  aria-label="افزودن گیاه"
                  className="grid size-8 place-items-center rounded-full bg-foreground/5"
                >
                  <Plus className="size-4" />
                </Link>
              </div>
              <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-4">
                <BigStat
                  value={toFa(dueToday.length)}
                  unit="گیاه"
                  label="آب می‌خوان"
                  className={dueToday.length ? "text-warn-ink" : ""}
                />
                <i className="h-11 w-px bg-foreground/15" />
                <BigStat value={toFa(plants.length)} unit="گیاه" label="در باغچه" />
              </div>
            </>
          )}
        </div>
      </section>

      {isEmpty ? (
        <GettingStarted />
      ) : (
        <>
          {/* Search */}
          <label className="glass-card mb-3.5 flex items-center gap-2.5 rounded-full px-[18px] py-3 text-muted-foreground">
            <Search className="size-4" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="جستجوی گیاه..."
              className="w-full bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
            />
          </label>

          {/* Weekly plan */}
          <section className="glass-card mb-3.5 rounded-[30px] px-4 pb-3.5 pt-[18px]">
            <div className="flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-base font-bold">
                <BarChart3 className="size-4" />
                آبیاری این هفته
              </h2>
              <span className="rounded-full bg-hatch px-2.5 py-0.5 text-[11px] font-medium">
                هفته
              </span>
            </div>
            <div className="mt-4 grid h-[150px] grid-cols-7 items-end gap-[7px] pt-[30px]">
              {week.map((w) => (
                <div key={w.off} className="relative flex h-full flex-col items-center justify-end">
                  {w.off === 0 && (
                    <span className="absolute -top-[30px] whitespace-nowrap rounded-[10px] bg-night px-2 py-0.5 text-[11px] font-semibold text-white fa-num after:absolute after:-bottom-1 after:left-1/2 after:-translate-x-1/2 after:border-x-4 after:border-t-4 after:border-x-transparent after:border-t-night after:content-['']">
                      {toFa(w.count)} منتظر آب
                    </span>
                  )}
                  <div
                    className={`flex min-h-[34px] w-full flex-col items-center rounded-[14px] pt-2 text-xs font-bold fa-num transition-[height] ${
                      w.off === 0
                        ? "bg-warn text-white"
                        : w.off < 0 && w.count > 0
                          ? "bg-primary text-white"
                          : "hatch text-muted-foreground"
                    }`}
                    style={{ height: `${28 + (w.count / maxCount) * 72}%` }}
                  >
                    <Droplet className="size-3 opacity-85" />
                    {toFa(w.count)}
                  </div>
                  <span className="mt-1.5 text-[11px] text-muted-foreground">{w.label}</span>
                </div>
              ))}
            </div>
            <div className="mt-2.5 flex flex-wrap gap-3.5 text-[11px] text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <i className="size-2.5 rounded bg-primary" />
                انجام‌شده
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="size-2.5 rounded bg-warn" />
                امروز
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="hatch size-2.5 rounded" />
                برنامه‌ریزی‌شده
              </span>
            </div>
            {!waterings.available && (
              <p className="mt-2 text-[11px] text-muted-foreground">
                سابقهٔ آبیاری هنوز فعال نشده؛ بعد از به‌روزرسانی دیتابیس نمایش داده می‌شه.
              </p>
            )}
          </section>

          {/* Plants */}
          <div className="mx-1 mb-3 mt-1.5 flex items-center justify-between">
            <h2 className="text-lg font-extrabold">گیاهان من</h2>
            <Link
              to="/add-plant"
              aria-label="افزودن گیاه"
              className="grid size-8 place-items-center rounded-full bg-foreground/5"
            >
              <Plus className="size-4" />
            </Link>
          </div>

          <div className="mb-3.5 grid grid-cols-2 gap-3">
            {filtered.length === 0 && (
              <div className="col-span-2 rounded-3xl border-[1.5px] border-dashed border-[#D9CFBD] p-7 text-center text-sm text-muted-foreground">
                {plants.length
                  ? "گیاهی با این نام پیدا نشد."
                  : "هنوز گیاهی اضافه نکردی. با دکمهٔ + شروع کن!"}
              </div>
            )}
            {filtered.map((p) => {
              const due = p.daysLeft <= 0;
              const late = p.daysLeft < 0;
              const pct = Math.max(0, Math.min(100, (p.daysLeft / p.watering_interval_days) * 100));
              return (
                <div
                  key={p.id}
                  className={`glass-card flex min-w-0 flex-col gap-2.5 rounded-3xl p-3.5 ${
                    due ? "!bg-gradient-to-br from-warn-soft/95 to-[#FCF9F3]/90" : ""
                  }`}
                >
                  <Link
                    to="/plant/$id"
                    params={{ id: p.id }}
                    aria-label={`جزئیات ${p.name}`}
                    className="flex min-w-0 flex-col gap-2.5"
                  >
                    <div className="flex min-w-0 items-center gap-2">
                      <span
                        className={`grid size-10 shrink-0 place-items-center overflow-hidden rounded-full text-lg ${
                          due ? "bg-peach" : "bg-brand-100"
                        }`}
                      >
                        {p.image_url ? (
                          <img src={p.image_url} alt="" className="size-full object-cover" />
                        ) : (
                          plantEmoji(p.type)
                        )}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">{p.name}</p>
                        {p.latin_name && (
                          <p
                            className="truncate text-left text-[10px] text-muted-foreground"
                            dir="ltr"
                          >
                            {p.latin_name}
                          </p>
                        )}
                      </div>
                    </div>

                    {late ? (
                      <BigStat
                        value={toFa(-p.daysLeft)}
                        unit="روز"
                        label="تأخیر در آبیاری!"
                        className="text-warn-ink"
                      />
                    ) : p.daysLeft === 0 ? (
                      <BigStat value="امروز" label="وقت آبیاریه" className="text-warn-ink" />
                    ) : (
                      <BigStat value={toFa(p.daysLeft)} unit="روز" label="تا آبیاری بعدی" />
                    )}
                  </Link>

                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex min-w-0 flex-wrap gap-1">
                      <span
                        className={`whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-medium ${
                          due ? "bg-warn-soft text-warn-ink" : "bg-brand-100"
                        }`}
                      >
                        {TYPE_FA[p.type ?? "indoor"] ?? "گیاه"}
                      </span>
                      {p.light_level && LIGHT_FA[p.light_level] && (
                        <span className="whitespace-nowrap rounded-full bg-hatch px-2 py-0.5 text-[11px] font-medium">
                          {LIGHT_FA[p.light_level]}
                        </span>
                      )}
                    </div>
                    <WaterButton
                      pct={pct}
                      due={due}
                      onClick={() => handleWater(p.id)}
                      name={p.name}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* AI card */}
      <button
        onClick={() => navigate({ to: "/diagnose" })}
        className="glass-card mb-6 flex w-full items-center gap-3 rounded-[30px] p-3.5 text-right"
      >
        <span className="grid size-[92px] shrink-0 place-items-center rounded-[22px] bg-gradient-to-br from-[#D6E9CC] to-[#F5EBDD] text-[44px]">
          🌿
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-base font-bold">تشخیص هوشمند گیاه</span>
          <span className="mt-1 block text-[13px] leading-relaxed text-muted-foreground">
            عکس بگیر و از متخصص هوش مصنوعی بپرس چه مشکلی داره
          </span>
        </span>
        <span className="grid size-11 shrink-0 place-items-center rounded-full border-[3px] border-primary bg-brand-100 text-primary">
          <ChevronLeft className="size-5" />
        </span>
      </button>
    </div>
  );
}

function WaterButton({
  pct,
  due,
  onClick,
  name,
}: {
  pct: number;
  due: boolean;
  onClick: () => void;
  name: string;
}) {
  const r = 19;
  const c = 2 * Math.PI * r;
  return (
    <button
      onClick={onClick}
      title="ثبت آبیاری"
      aria-label={`ثبت آبیاری ${name}`}
      className="relative grid size-[34px] shrink-0 place-items-center rounded-full bg-night text-white"
    >
      <svg viewBox="0 0 42 42" className="absolute -inset-1 size-[42px] -rotate-90">
        <circle cx="21" cy="21" r={r} strokeWidth="3" className="fill-none stroke-foreground/10" />
        <circle
          cx="21"
          cy="21"
          r={r}
          strokeWidth="3"
          strokeLinecap="round"
          className={`fill-none transition-[stroke-dashoffset] ${due ? "stroke-warn" : "stroke-primary"}`}
          strokeDasharray={c}
          strokeDashoffset={c - (pct / 100) * c}
        />
      </svg>
      <Droplet className="relative size-[15px]" />
    </button>
  );
}

function GettingStarted() {
  const steps = [
    {
      icon: "🪴",
      title: "گیاهت رو اضافه کن",
      text: "اسم، نوع و نور محل نگهداریش رو بنویس؛ عکس هم می‌تونی بذاری.",
    },
    {
      icon: "✨",
      title: "دور آبیاری رو تنظیم کن",
      text: "خودت بزن یا از هوش مصنوعی بخواه پیشنهاد بده.",
    },
    {
      icon: "💧",
      title: "هر روز یه نگاه بنداز",
      text: "هر گیاهی آب بخواد اینجا و توی یادآورها نشونت می‌دیم.",
    },
  ];
  return (
    <section className="glass-card mb-3.5 rounded-[30px] p-4">
      <h2 className="mb-3 text-base font-bold">گلدون چطور کار می‌کنه؟</h2>
      <ol className="space-y-3">
        {steps.map((st, i) => (
          <li key={st.title} className="flex items-start gap-3">
            <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-brand-100 text-xl">
              {st.icon}
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold">
                <span className="text-muted-foreground fa-num">{toFa(i + 1)}. </span>
                {st.title}
              </p>
              <p className="mt-0.5 text-xs leading-6 text-muted-foreground">{st.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
