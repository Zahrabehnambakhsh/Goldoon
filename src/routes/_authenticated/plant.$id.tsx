import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Droplet, Trash2, CalendarDays, TriangleAlert } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Foliage } from "@/components/foliage";
import { BackButton, BigStat, IconBubble, Segmented } from "@/components/garden-ui";
import { PlantForm } from "@/components/plant-form";
import { deletePlant, getPlant, updatePlant } from "@/lib/plants.functions";
import { useWaterAction } from "@/lib/use-water";
import { overwaterInfo } from "@/lib/watering";
import { daysBetween, faDate, toFa } from "@/lib/fa";
import { PlantIcon } from "@/components/flat-art";

export const Route = createFileRoute("/_authenticated/plant/$id")({
  head: () => ({
    meta: [{ title: "Goldoon" }, { name: "description", content: "جزئیات، ویرایش و حذف گیاه." }],
  }),
  loader: ({ context, params }) =>
    context.queryClient.ensureQueryData({
      queryKey: ["plant", params.id],
      queryFn: () => getPlant({ data: { id: params.id } }),
    }),
  component: PlantPage,
});

const TYPE_FA: Record<string, string> = {
  indoor: "آپارتمانی",
  garden: "باغی",
  cactus: "کاکتوس",
  aquatic: "آبزی",
};
const LIGHT_FA: Record<string, string> = { low: "نور کم", medium: "نور متوسط", high: "نور زیاد" };

function PlantPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const updateFn = useServerFn(updatePlant);
  const deleteFn = useServerFn(deletePlant);
  const water = useWaterAction();
  const [tab, setTab] = useState<"info" | "edit">("info");
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const { data: plant } = useSuspenseQuery({
    queryKey: ["plant", id],
    queryFn: () => getPlant({ data: { id } }),
  });

  const refresh = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["plant", id] }),
      qc.invalidateQueries({ queryKey: ["plants"] }),
      qc.invalidateQueries({ queryKey: ["waterings"] }),
    ]);

  const daysLeft =
    plant.watering_interval_days - daysBetween(new Date(), new Date(plant.last_watered));
  const ow = overwaterInfo(plant);
  const due = !ow.overwatered && daysLeft <= 0;

  const handleWater = async () => {
    setBusy(true);
    try {
      await water(id, plant.name);
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    setBusy(true);
    try {
      await deleteFn({ data: { id } });
      qc.removeQueries({ queryKey: ["plant", id] });
      await qc.invalidateQueries({ queryKey: ["plants"] });
      await qc.invalidateQueries({ queryKey: ["waterings"] });
      toast.success("گیاه حذف شد");
      navigate({ to: "/home" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
      setBusy(false);
    }
  };

  return (
    <div className="px-4 pt-[18px]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <BackButton onClick={() => navigate({ to: "/home" })} />
        <Segmented
          value={tab}
          onChange={setTab}
          options={[
            { value: "info", label: "جزئیات" },
            { value: "edit", label: "ویرایش" },
          ]}
        />
      </header>

      {tab === "edit" ? (
        <>
          <h1 className="mb-3.5 text-2xl font-extrabold">ویرایش {plant.name}</h1>
          <PlantForm
            key={plant.id}
            initial={{
              name: plant.name,
              latin_name: plant.latin_name,
              type: plant.type ?? "indoor",
              image_url: plant.image_url,
              watering_interval_days: plant.watering_interval_days,
              last_watered: plant.last_watered,
              light_level:
                (["low", "medium", "high"] as const).find((l) => l === plant.light_level) ??
                "medium",
              notes: plant.notes,
            }}
            submitLabel="ذخیره تغییرات"
            onSubmit={async (values) => {
              await updateFn({ data: { id, ...values } });
              await refresh();
              toast.success("تغییرات ذخیره شد");
              setTab("info");
            }}
          />
        </>
      ) : (
        <>
          <section className="hero-sand relative mb-3.5 flex min-h-[260px] flex-col overflow-hidden rounded-[34px] px-5 pt-[22px]">
            {plant.image_url ? (
              <img
                src={plant.image_url}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <>
                <Foliage />
                <span className="pointer-events-none absolute left-1/2 top-[20px] grid size-[150px] -translate-x-1/2 place-items-center rounded-full bg-white/55">
                  <PlantIcon type={plant.type} className="size-[110px]" />
                </span>
              </>
            )}
            <div className="relative mt-auto -mx-5 rounded-t-[28px] rounded-b-[32px] border-t border-white/90 bg-[#FFFFFF]/95 px-5 pb-4 pt-3.5">
              <h1 className="truncate text-2xl font-extrabold">{plant.name}</h1>
              {plant.latin_name && (
                <p className="truncate text-right text-xs text-muted-foreground" dir="ltr">
                  {plant.latin_name}
                </p>
              )}
              <div className="mt-2 flex flex-wrap gap-1.5">
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-medium">
                  {TYPE_FA[plant.type ?? "indoor"] ?? "گیاه"}
                </span>
                {plant.light_level && LIGHT_FA[plant.light_level] && (
                  <span className="rounded-full bg-hatch px-2.5 py-0.5 text-[11px] font-medium">
                    {LIGHT_FA[plant.light_level]}
                  </span>
                )}
              </div>
            </div>
          </section>

          {ow.overwatered && (
            <div
              role="alert"
              className="mb-3.5 flex items-start gap-3 rounded-3xl border border-[#F6C9C9] bg-gradient-to-br from-[#FDE4E4] to-[#FFFFFF]/90 p-4 text-[#C93C3C]"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[#E5484D] text-white">
                <TriangleAlert className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-[15px] font-extrabold">نه، زیاد آب دادی!</p>
                <p className="mt-0.5 text-xs leading-6">
                  خاک {plant.name} هنوز خیسه و آب زیادی ریشه‌ش رو می‌پوسونه. تا {toFa(ow.waitDays)}{" "}
                  روز دیگه بهش آب نده.
                </p>
              </div>
            </div>
          )}

          <div className="mb-3.5 grid grid-cols-2 gap-3">
            <div
              className={`glass-card flex flex-col gap-3.5 rounded-3xl p-3.5 ${
                ow.overwatered
                  ? "!border-[#F6C9C9] !bg-gradient-to-br from-[#FDE4E4] to-[#FFFFFF]/90"
                  : due
                    ? "!bg-gradient-to-br from-warn-soft/95 to-[#FFFFFF]/90"
                    : ""
              }`}
            >
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                <IconBubble tone={due ? "peach" : "mint"}>
                  <Droplet className="size-5" />
                </IconBubble>
                آبیاری بعدی
              </div>
              {ow.overwatered ? (
                <BigStat
                  value="زیادی!"
                  label={`${toFa(ow.waitDays)} روز آب نده`}
                  className="text-[#D64545]"
                />
              ) : daysLeft < 0 ? (
                <BigStat
                  value={toFa(-daysLeft)}
                  unit="روز"
                  label="تأخیر!"
                  className="text-warn-ink"
                />
              ) : daysLeft === 0 ? (
                <BigStat value="امروز" label="وقت آبیاریه" className="text-warn-ink" />
              ) : (
                <BigStat value={toFa(daysLeft)} unit="روز" label="دیگه" />
              )}
            </div>
            <div className="glass-card flex flex-col gap-3.5 rounded-3xl p-3.5">
              <div className="flex items-center gap-2 text-[13px] font-semibold">
                <IconBubble tone="lilac">
                  <CalendarDays className="size-5 text-[#6B5FB5]" />
                </IconBubble>
                دور آبیاری
              </div>
              <BigStat
                value={toFa(plant.watering_interval_days)}
                unit="روز"
                label={`آخرین بار: ${faDate(new Date(plant.last_watered))}`}
              />
            </div>
          </div>

          {plant.notes && (
            <div className="glass-card mb-3.5 rounded-3xl p-4">
              <h2 className="mb-1.5 text-sm font-bold">یادداشت</h2>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                {plant.notes}
              </p>
            </div>
          )}

          <button
            onClick={handleWater}
            disabled={busy}
            className={`mb-3 flex w-full items-center justify-center gap-2 rounded-full py-[15px] text-[15px] font-semibold text-white shadow-soft transition disabled:opacity-60 ${
              ow.overwatered ? "bg-[#E5484D] hover:bg-[#D13C41]" : "bg-primary hover:bg-brand-900"
            }`}
          >
            <Droplet className="size-4" />
            همین الان آب دادم
          </button>

          {confirming ? (
            <div className="glass-card mb-6 rounded-3xl p-4 text-center">
              <p className="mb-3 text-sm font-semibold">
                «{plant.name}» و سابقهٔ آبیاری‌اش برای همیشه حذف بشه؟
              </p>
              <div className="flex gap-2">
                <button
                  onClick={handleDelete}
                  disabled={busy}
                  className="flex-1 rounded-full bg-destructive py-3 text-sm font-bold text-destructive-foreground disabled:opacity-60"
                >
                  {busy ? "در حال حذف..." : "بله، حذف کن"}
                </button>
                <button
                  onClick={() => setConfirming(false)}
                  disabled={busy}
                  className="flex-1 rounded-full border border-input bg-white py-3 text-sm font-semibold"
                >
                  انصراف
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setConfirming(true)}
              className="mb-6 flex w-full items-center justify-center gap-2 rounded-[20px] border border-destructive/25 bg-card p-3.5 text-sm font-bold text-destructive shadow-soft"
            >
              <Trash2 className="size-4" />
              حذف گیاه
            </button>
          )}
        </>
      )}
    </div>
  );
}
