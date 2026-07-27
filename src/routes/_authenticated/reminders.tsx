import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPlants, waterPlant } from "@/lib/plants.functions";
import { toFa, daysBetween, plantEmoji } from "@/lib/fa";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reminders")({
  head: () => ({
    meta: [
      { title: "یادآورها • مراقبت آینده گیاه" },
      { name: "description", content: "برنامه آبیاری امروز و روزهای آینده." },
    ],
  }),
  loader: ({ context }) =>
    context.queryClient.ensureQueryData({ queryKey: ["plants"], queryFn: () => listPlants() }),
  component: Reminders,
});

function Reminders() {
  const qc = useQueryClient();
  const waterFn = useServerFn(waterPlant);
  const { data: plants } = useSuspenseQuery({ queryKey: ["plants"], queryFn: () => listPlants() });
  const today = new Date();

  const dueToday = plants
    .map((p) => ({
      ...p,
      daysLeft: p.watering_interval_days - daysBetween(today, new Date(p.last_watered)),
    }))
    .filter((p) => p.daysLeft <= 0);

  const upcoming = plants
    .map((p) => ({
      ...p,
      daysLeft: p.watering_interval_days - daysBetween(today, new Date(p.last_watered)),
    }))
    .filter((p) => p.daysLeft > 0 && p.daysLeft <= 7)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const handleWater = async (id: string) => {
    try {
      await waterFn({ data: { id } });
      qc.invalidateQueries({ queryKey: ["plants"] });
      toast.success("آبیاری ثبت شد ✅");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    }
  };

  const dayName = (d: number) => {
    const dt = new Date();
    dt.setDate(dt.getDate() + d);
    return new Intl.DateTimeFormat("fa-IR", { weekday: "long" }).format(dt);
  };

  return (
    <div className="px-5 pt-6">
      <h1 className="mb-6 text-center text-lg font-bold text-primary">یادآورها ⏰</h1>

      <section className="mb-6">
        <h2 className="mb-3 text-base font-bold text-primary">امروز</h2>
        {dueToday.length === 0 ? (
          <div className="rounded-2xl bg-brand-100 p-5 text-center text-sm text-primary">
            امروز آبیاری‌ای نداری! 🎉
          </div>
        ) : (
          <div className="space-y-2">
            {dueToday.map((p) => (
              <div
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3 shadow-soft"
              >
                <div className="grid size-11 place-items-center rounded-2xl bg-brand-100 text-xl">
                  {plantEmoji(p.type)}
                </div>
                <p className="flex-1 font-semibold text-primary">{p.name}</p>
                <button
                  onClick={() => handleWater(p.id)}
                  className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground"
                >
                  آبیاری کن
                </button>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mb-6">
        <h2 className="mb-3 text-base font-bold text-primary">هفته آینده</h2>
        {upcoming.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">
            چیزی برای هفته آینده نداری.
          </div>
        ) : (
          <ul className="space-y-2">
            {upcoming.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl bg-card border border-border p-3"
              >
                <span className="text-lg">{plantEmoji(p.type)}</span>
                <div className="flex-1">
                  <p className="text-sm font-semibold text-primary">{p.name}</p>
                  <p className="text-[11px] text-muted-foreground">{dayName(p.daysLeft)}</p>
                </div>
                <span className="rounded-full bg-brand-100 px-3 py-1 text-[11px] font-bold text-primary fa-num">
                  {toFa(p.daysLeft)} روز
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
