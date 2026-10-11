import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Droplet, CalendarDays } from "lucide-react";
import { BackButton, BigStat, IconBubble, Segmented } from "@/components/garden-ui";
import { useSuspenseQuery } from "@tanstack/react-query";
import { listPlants } from "@/lib/plants.functions";
import { useWaterAction } from "@/lib/use-water";
import { toFa, daysBetween } from "@/lib/fa";
import { PlantIcon } from "@/components/flat-art";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({
    meta: [
      { title: "Goldoon" },
      { name: "description", content: "برنامه آبیاری امروز و روزهای آینده." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["plants"], queryFn: () => listPlants() }),
  component: Reminders,
});

const DAY_LONG = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"]; // by Date.getDay()

function Reminders() {
  const navigate = useNavigate();
  const water = useWaterAction();
  const { data: plants } = useSuspenseQuery({ queryKey: ["plants"], queryFn: () => listPlants() });
  const [tab, setTab] = useState<"day" | "week">("day");
  const today = new Date();

  const withLeft = plants.map((p) => ({
    ...p,
    daysLeft: p.watering_interval_days - daysBetween(today, new Date(p.last_watered)),
  }));
  const dueToday = withLeft.filter((p) => p.daysLeft <= 0).sort((a, b) => a.daysLeft - b.daysLeft);
  const upcoming = withLeft.filter((p) => p.daysLeft > 0 && p.daysLeft <= 7);

  const groups = Array.from({ length: 7 }, (_, i) => i + 1)
    .map((k) => {
      const d = new Date(today);
      d.setDate(d.getDate() + k);
      return { k, day: DAY_LONG[d.getDay()], items: upcoming.filter((p) => p.daysLeft === k) };
    })
    .filter((g) => g.items.length > 0);

  return (
    <div className="px-4 pt-[18px]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <BackButton onClick={() => navigate({ to: "/home" })} />
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "day", label: "امروز" },
            { value: "week", label: "هفته" },
          ]}
        />
      </header>
      <h1 className="mb-3.5 text-2xl font-extrabold">یادآورها</h1>

      <div className="mb-3.5 grid grid-cols-2 gap-3">
        <div className="glass-card flex flex-col gap-3.5 rounded-3xl p-3.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <IconBubble tone="peach">
              <Droplet className="size-5 text-warn-ink" />
            </IconBubble>
            امروز
          </div>
          <BigStat value={toFa(dueToday.length)} unit="گیاه" label="باید آب بخورن" />
        </div>
        <div className="glass-card flex flex-col gap-3.5 rounded-3xl p-3.5">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <IconBubble tone="mint">
              <CalendarDays className="size-5" />
            </IconBubble>
            هفته آینده
          </div>
          <BigStat value={toFa(upcoming.length)} unit="گیاه" label="در برنامه" />
        </div>
      </div>

      {tab === "day" ? (
        dueToday.length === 0 ? (
          <div className="glass-card rounded-3xl p-6 text-center text-sm">
            امروز آبیاری‌ای نداری!
          </div>
        ) : (
          <div className="space-y-3">
            {dueToday.map((p) => (
              <div key={p.id} className="glass-card flex items-center gap-3 rounded-3xl p-3">
                <span
                  className={`grid size-12 shrink-0 place-items-center rounded-full ${
                    p.daysLeft < 0 ? "bg-peach" : "bg-brand-100"
                  }`}
                >
                  <PlantIcon type={p.type} className="size-8" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold">{p.name}</p>
                  {p.daysLeft < 0 ? (
                    <p className="text-xs font-semibold text-warn-ink fa-num">
                      {toFa(-p.daysLeft)} روز تأخیر
                    </p>
                  ) : (
                    <p className="text-xs text-muted-foreground">امروز وقت آبیاریه</p>
                  )}
                </div>
                <button
                  onClick={() => water(p.id, p.name)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-primary px-4 py-2 text-[13px] font-semibold text-primary-foreground transition hover:bg-brand-900"
                >
                  <Droplet className="size-4" />
                  آبیاری
                </button>
              </div>
            ))}
          </div>
        )
      ) : groups.length === 0 ? (
        <div className="glass-card rounded-3xl p-6 text-center text-sm">
          چیزی برای هفته آینده نداری.
        </div>
      ) : (
        <div className="space-y-2.5">
          {groups.map((g) => (
            <div key={g.k} className="glass-card rounded-3xl p-3.5">
              <h2 className="mb-2.5 flex items-center justify-between text-sm font-bold">
                {g.day}
                <small className="text-[11px] font-medium text-muted-foreground fa-num">
                  {g.k === 1 ? "فردا" : `${toFa(g.k)} روز دیگر`}
                </small>
              </h2>
              {g.items.map((p, idx) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2.5 py-2 ${idx ? "border-t border-dashed border-input" : "pt-0"}`}
                >
                  <PlantIcon type={p.type} className="size-6" />
                  <p className="flex-1 truncate text-sm font-semibold">{p.name}</p>
                  <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-medium fa-num">
                    هر {toFa(p.watering_interval_days)} روز
                  </span>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
