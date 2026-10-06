import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Droplet, Minus, Plus, Sparkles } from "lucide-react";
import { Foliage } from "@/components/foliage";
import { BackButton, BigStat, Segmented } from "@/components/garden-ui";
import { useState } from "react";
import { createPlant } from "@/lib/plants.functions";
import { suggestWateringInterval } from "@/lib/suggest.functions";
import { toFa } from "@/lib/fa";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/add-plant")({
  head: () => ({
    meta: [
      { title: "افزودن گیاه • Goldoon" },
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
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const max = 480;
        const scale = Math.min(1, max / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
        setImageData(canvas.toDataURL("image/jpeg", 0.75));
      };
      img.src = reader.result as string;
    };
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
    <div className="px-4 pt-[18px]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <BackButton onClick={() => navigate({ to: "/home" })} />
        <Segmented value="new" options={[{ value: "new", label: "گیاه جدید" }]} />
      </header>
      <h1 className="mb-3.5 text-2xl font-extrabold">افزودن گیاه</h1>

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
                  <div className="grid size-[50px] place-items-center rounded-full bg-night text-white">
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
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-full bg-night py-2.5 text-[13px] font-semibold text-white disabled:opacity-60"
          >
            <Sparkles className="size-4 text-[#F6C66B]" />
            {suggesting ? "در حال دریافت پیشنهاد..." : "پیشنهاد هوش مصنوعی"}
          </button>
          {suggestReason && (
            <p className="mt-2.5 flex gap-2 rounded-2xl bg-brand-100 px-3 py-2.5 text-xs leading-relaxed">
              <span>✨</span>
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
          {loading ? "در حال ذخیره..." : "افزودن گیاه 🌱"}
        </button>
      </form>
    </div>
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
