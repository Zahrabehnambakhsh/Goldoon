import { useServerFn } from "@tanstack/react-start";
import { Camera, Droplet, Minus, Plus, Sparkles } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Foliage } from "@/components/foliage";
import { BigStat } from "@/components/garden-ui";
import { suggestWateringInterval } from "@/lib/suggest.functions";
import { toFa } from "@/lib/fa";
import { compressImage } from "@/lib/image";

export type PlantValues = {
  name: string;
  latin_name: string | null;
  type: string;
  image_url: string | null;
  watering_interval_days: number;
  last_watered: string;
  light_level: "low" | "medium" | "high";
  notes: string | null;
};

const TYPES: Array<{ v: string; label: string }> = [
  { v: "indoor", label: "آپارتمانی" },
  { v: "garden", label: "باغی" },
  { v: "cactus", label: "کاکتوس" },
  { v: "aquatic", label: "آبزی" },
];

function todayIso() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Shared add/edit form for a plant. */
export function PlantForm({
  initial,
  submitLabel,
  onSubmit,
}: {
  initial?: Partial<PlantValues>;
  submitLabel: string;
  onSubmit: (values: PlantValues) => Promise<void>;
}) {
  const suggestFn = useServerFn(suggestWateringInterval);

  const [name, setName] = useState(initial?.name ?? "");
  const [latin, setLatin] = useState(initial?.latin_name ?? "");
  const [type, setType] = useState(initial?.type ?? "indoor");
  const [interval, setInterval_] = useState(initial?.watering_interval_days ?? 7);
  const [lastWatered, setLastWatered] = useState(initial?.last_watered ?? todayIso());
  const [light, setLight] = useState<"low" | "medium" | "high">(initial?.light_level ?? "medium");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [imageData, setImageData] = useState<string | null>(initial?.image_url ?? null);
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

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = ""; // allow picking the same file again
    if (!f) return;
    try {
      // Plant photos are shown small, so keep them light (well under the 400k server limit).
      setImageData(await compressImage(f, { maxSide: 640, maxChars: 300_000 }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "عکس اضافه نشد");
    }
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        latin_name: latin.trim() || null,
        type,
        image_url: imageData,
        watering_interval_days: interval,
        last_watered: lastWatered,
        light_level: light,
        notes: notes.trim() || null,
      });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-3.5">
      <label className="block cursor-pointer">
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <div className="hero-sand relative grid h-[190px] place-items-center overflow-hidden rounded-[30px]">
          {imageData ? (
            <img src={imageData} alt="گیاه" className="size-full object-cover" />
          ) : (
            <>
              <Foliage />
              <div className="relative flex flex-col items-center gap-2.5">
                <div className="grid size-[50px] place-items-center rounded-full bg-white/80 text-primary shadow-soft">
                  <Camera className="size-5" />
                </div>
                <p className="text-sm font-semibold">عکس گیاه را اضافه کنید</p>
              </div>
            </>
          )}
        </div>
      </label>

      <div className="glass-card space-y-3.5 rounded-[30px] p-4">
        <Field label="نام گیاه">
          <input
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً پوتوس"
            className={INPUT}
          />
        </Field>

        <Field label="نام علمی">
          <input
            dir="ltr"
            value={latin}
            onChange={(e) => setLatin(e.target.value)}
            placeholder="Epipremnum aureum"
            className={INPUT}
          />
        </Field>

        <FieldGroup label="نوع گیاه">
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Choice key={t.v} on={type === t.v} onClick={() => setType(t.v)}>
                {t.label}
              </Choice>
            ))}
          </div>
        </FieldGroup>

        <FieldGroup label="میزان نور">
          <div className="flex flex-wrap gap-2">
            {(["low", "medium", "high"] as const).map((l) => (
              <Choice key={l} on={light === l} onClick={() => setLight(l)}>
                {l === "low" ? "کم" : l === "medium" ? "متوسط" : "زیاد"}
              </Choice>
            ))}
          </div>
        </FieldGroup>
      </div>

      <div className="glass-card rounded-[30px] p-4">
        <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
          <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-primary">
            <Droplet className="size-4" />
          </span>
          دور آبیاری
        </h2>
        <div className="flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={() => setInterval_((n) => Math.max(1, n - 1))}
            aria-label="کم کردن"
            className="grid size-11 place-items-center rounded-full border border-input bg-white"
          >
            <Minus className="size-4" />
          </button>
          <BigStat value={toFa(interval)} unit="روز" className="flex-1 text-center" />
          <button
            type="button"
            onClick={() => setInterval_((n) => Math.min(60, n + 1))}
            aria-label="زیاد کردن"
            className="grid size-11 place-items-center rounded-full border border-input bg-white"
          >
            <Plus className="size-4" />
          </button>
        </div>
        <button
          type="button"
          onClick={handleSuggest}
          disabled={suggesting}
          className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-brand-100 py-2.5 text-[13px] font-semibold text-primary disabled:opacity-60"
        >
          <Sparkles className="size-4" />
          {suggesting ? "در حال دریافت پیشنهاد..." : "پیشنهاد هوش مصنوعی"}
        </button>
        {suggestReason && (
          <p className="mt-2.5 flex gap-2 rounded-2xl bg-brand-100 px-3 py-2.5 text-xs leading-relaxed">
            <Sparkles className="mt-1 size-3.5 shrink-0 text-primary" />
            <span>{suggestReason}</span>
          </p>
        )}
      </div>

      <div className="glass-card space-y-3.5 rounded-[30px] p-4">
        <Field label="آخرین آبیاری">
          <input
            type="date"
            dir="ltr"
            value={lastWatered}
            onChange={(e) => setLastWatered(e.target.value)}
            className={INPUT}
          />
        </Field>

        <Field label="یادداشت">
          <textarea
            maxLength={200}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="مثلاً کنار پنجرهٔ آشپزخانه"
            className={`${INPUT} h-[90px] resize-none`}
          />
          <p className="mt-1 text-left text-[11px] text-muted-foreground fa-num">
            {toFa(notes.length)}/{toFa(200)}
          </p>
        </Field>
      </div>

      <button
        disabled={loading}
        type="submit"
        className="mb-4 w-full rounded-full bg-primary py-[15px] text-[15px] font-semibold text-primary-foreground shadow-soft transition hover:bg-brand-900 disabled:opacity-60"
      >
        {loading ? "در حال ذخیره..." : submitLabel}
      </button>
    </form>
  );
}

const INPUT =
  "w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary";

function Choice({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-w-16 flex-1 rounded-[14px] border px-1 py-2 text-[13px] font-medium transition ${
        on ? "border-primary bg-primary text-primary-foreground" : "border-input bg-white"
      }`}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold">{label}</span>
      {children}
    </label>
  );
}

function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div role="group" aria-label={label}>
      <span className="mb-2 block text-[13px] font-semibold">{label}</span>
      {children}
    </div>
  );
}
