import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowRight, Camera, Minus, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { createPlant } from "@/lib/plants.functions";
import { suggestWateringInterval } from "@/lib/suggest.functions";
import { toFa } from "@/lib/fa";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/add-plant")({
  head: () => ({
    meta: [
      { title: "افزودن گیاه • مراقبت آینده گیاه" },
      { name: "description", content: "گیاه جدیدی به مجموعه‌ات اضافه کن." },
    ],
  }),
  component: AddPlantPage,
});

const TYPES: Array<{ v: string; label: string }> = [
  { v: "indoor", label: "آپارتمانی" },
  { v: "garden", label: "باغی" },
  { v: "cactus", label: "کاکتوس" },
  { v: "aquatic", label: "آبزی" },
];

function AddPlantPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const createFn = useServerFn(createPlant);
  const suggestFn = useServerFn(suggestWateringInterval);

  const [name, setName] = useState("");
  const [latin, setLatin] = useState("");
  const [type, setType] = useState("indoor");
  const [interval, setInterval_] = useState(7);
  const [lastWatered, setLastWatered] = useState(new Date().toISOString().slice(0, 10));
  const [light, setLight] = useState<"low" | "medium" | "high">("medium");
  const [notes, setNotes] = useState("");
  const [imageData, setImageData] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [suggestReason, setSuggestReason] = useState<string | null>(null);

  const handleSuggest = async () => {
    if (!name.trim()) {
      toast.error("اول نام گیاه را وارد کن");
      return;
    }
    setSuggesting(true);
    try {
      const res = await suggestFn({
        data: { name, latin_name: latin || null, type, light_level: light },
      });
      setInterval_(res.days);
      setSuggestReason(res.reason);
      toast.success(`پیشنهاد هوش مصنوعی: هر ${toFa(res.days)} روز`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا در دریافت پیشنهاد");
    } finally {
      setSuggesting(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => setImageData(reader.result as string);
    reader.readAsDataURL(f);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await createFn({
        data: {
          name,
          latin_name: latin || null,
          type,
          image_url: imageData,
          watering_interval_days: interval,
          last_watered: lastWatered,
          light_level: light,
          notes: notes || null,
        },
      });
      qc.invalidateQueries({ queryKey: ["plants"] });
      toast.success("گیاه اضافه شد 🌱");
      navigate({ to: "/home" });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-5 pt-6">
      <header className="mb-5 flex items-center gap-3">
        <button
          onClick={() => navigate({ to: "/home" })}
          className="grid size-10 place-items-center rounded-full bg-card shadow-soft"
        >
          <ArrowRight className="size-5" />
        </button>
        <h1 className="flex-1 text-center text-lg font-bold text-primary">افزودن گیاه</h1>
        <div className="size-10" />
      </header>

      <form onSubmit={submit} className="space-y-4">
        <label className="block cursor-pointer">
          <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
          <div className="grid h-44 place-items-center rounded-3xl border-2 border-dashed border-brand-500 bg-brand-100 overflow-hidden">
            {imageData ? (
              <img src={imageData} alt="گیاه" className="size-full object-cover" />
            ) : (
              <div className="flex flex-col items-center gap-2 text-primary">
                <div className="text-4xl">🌿</div>
                <p className="text-sm">عکس گیاه را اضافه کنید</p>
                <div className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground">
                  <Camera className="size-5" />
                </div>
              </div>
            )}
          </div>
        </label>

        <Field label="نام گیاه">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </Field>

        <Field label="نام علمی">
          <input
            dir="ltr"
            value={latin}
            onChange={(e) => setLatin(e.target.value)}
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </Field>

        <Field label="نوع گیاه">
          <div className="grid grid-cols-4 gap-2">
            {TYPES.map((t) => (
              <button
                key={t.v}
                type="button"
                onClick={() => setType(t.v)}
                className={`rounded-full py-2 text-xs font-medium transition ${
                  type === t.v
                    ? "bg-primary text-primary-foreground"
                    : "bg-brand-100 text-primary"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="دور آبیاری">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setInterval_((n) => Math.max(1, n - 1))}
              className="grid size-10 place-items-center rounded-full bg-brand-100 text-primary"
            >
              <Minus className="size-4" />
            </button>
            <div className="flex-1 rounded-xl bg-card border border-input py-3 text-center font-bold text-primary">
              {toFa(interval)} روز
            </div>
            <button
              type="button"
              onClick={() => setInterval_((n) => Math.min(60, n + 1))}
              className="grid size-10 place-items-center rounded-full bg-brand-100 text-primary"
            >
              <Plus className="size-4" />
            </button>
          </div>
          <button
            type="button"
            onClick={handleSuggest}
            disabled={suggesting}
            className="mt-2 flex w-full items-center justify-center gap-2 rounded-full border border-primary/30 bg-brand-100 py-2.5 text-xs font-medium text-primary disabled:opacity-60"
          >
            <Sparkles className="size-4" />
            {suggesting ? "در حال دریافت پیشنهاد..." : "پیشنهاد هوش مصنوعی ✨"}
          </button>
          {suggestReason && (
            <p className="mt-2 rounded-xl bg-brand-100 px-3 py-2 text-[11px] leading-relaxed text-primary">
              {suggestReason}
            </p>
          )}
        </Field>

        <Field label="آخرین آبیاری">
          <input
            type="date"
            dir="ltr"
            value={lastWatered}
            onChange={(e) => setLastWatered(e.target.value)}
            className="w-full rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
        </Field>

        <Field label="میزان نور">
          <div className="grid grid-cols-3 gap-2">
            {(["low", "medium", "high"] as const).map((l) => (
              <button
                key={l}
                type="button"
                onClick={() => setLight(l)}
                className={`rounded-full py-2 text-xs font-medium transition ${
                  light === l ? "bg-primary text-primary-foreground" : "bg-brand-100 text-primary"
                }`}
              >
                {l === "low" ? "کم" : l === "medium" ? "متوسط" : "زیاد"}
              </button>
            ))}
          </div>
        </Field>

        <Field label="یادداشت">
          <textarea
            maxLength={200}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="h-24 w-full resize-none rounded-xl border border-input bg-card px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <p className="mt-1 text-left text-[11px] text-muted-foreground fa-num">
            {toFa(notes.length)}/{toFa(200)}
          </p>
        </Field>

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-full bg-primary py-3.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60"
        >
          {loading ? "در حال ذخیره..." : "افزودن گیاه 🌱"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-primary">{label}</span>
      {children}
    </label>
  );
}
