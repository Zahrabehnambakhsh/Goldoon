import { JalaliDateInput } from "@/components/jalali-date-input";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Droplet, Minus, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Foliage } from "@/components/foliage";
import { BigStat } from "@/components/garden-ui";
import { suggestWateringInterval } from "@/lib/suggest.functions";
import { listPlantCatalog } from "@/lib/plants.functions";
import { buildIndex, exactMatch, searchCatalog, type CatalogPlant } from "@/lib/catalog";
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

  // Name suggestions: the catalog is loaded once and searched on the device while typing.
  const { data: catalog } = useQuery({
    queryKey: ["plant-catalog"],
    queryFn: () => listPlantCatalog(),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
  });
  const index = useMemo(() => buildIndex(catalog ?? []), [catalog]);
  const [typing, setTyping] = useState(false);
  const [active, setActive] = useState(-1);
  const [fromCatalog, setFromCatalog] = useState(false);
  const [autoLatin, setAutoLatin] = useState<string | null>(null); // latin name we filled ourselves

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

  const matches = useMemo(() => (typing ? searchCatalog(index, name) : []), [typing, index, name]);

  const onNameChange = (value: string) => {
    setName(value);
    setTyping(true);
    setActive(-1);
    setFromCatalog(false);
    // Typed exactly the name of a known plant: fill in its scientific name right away.
    const hit = exactMatch(index, value);
    if (hit && (!latin.trim() || latin === autoLatin)) {
      setLatin(hit.latin_name);
      setAutoLatin(hit.latin_name);
    }
  };

  /** Picking a suggestion fills in the scientific name, type, light and usual watering interval. */
  const pick = (p: CatalogPlant) => {
    setName(p.name_fa);
    setLatin(p.latin_name);
    setAutoLatin(p.latin_name);
    setType(p.type);
    if (p.light_level === "low" || p.light_level === "medium" || p.light_level === "high") {
      setLight(p.light_level);
    }
    if (p.watering_interval_days) setInterval_(p.watering_interval_days);
    setSuggestReason(null);
    setFromCatalog(true);
    setTyping(false);
    setActive(-1);
  };

  const onNameKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (matches.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % matches.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? matches.length - 1 : i - 1));
    } else if (e.key === "Enter" && active >= 0) {
      e.preventDefault(); // choose the highlighted plant instead of submitting the form
      pick(matches[active]);
    } else if (e.key === "Escape") {
      setTyping(false);
    }
  };

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
          <div className="relative">
            <input
              required
              value={name}
              onChange={(e) => onNameChange(e.target.value)}
              onKeyDown={onNameKeyDown}
              onBlur={() => setTyping(false)}
              placeholder="مثلاً پوتوس"
              autoComplete="off"
              role="combobox"
              aria-expanded={matches.length > 0}
              aria-autocomplete="list"
              className={INPUT}
            />
            {matches.length > 0 && (
              <ul
                role="listbox"
                className="absolute inset-x-0 top-full z-20 mt-1.5 overflow-hidden rounded-2xl border border-input bg-white shadow-soft"
              >
                {matches.map((p, i) => (
                  <li
                    key={p.name_fa}
                    role="option"
                    aria-selected={i === active}
                    // mousedown (not click) so it runs before the input loses focus
                    onMouseDown={(e) => {
                      e.preventDefault();
                      pick(p);
                    }}
                    className={`flex cursor-pointer items-center justify-between gap-3 px-4 py-2.5 text-sm ${
                      i === active ? "bg-brand-100" : "hover:bg-brand-100/60"
                    }`}
                  >
                    <span className="font-semibold">{p.name_fa}</span>
                    <span dir="ltr" className="truncate text-xs italic text-muted-foreground">
                      {p.latin_name}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {fromCatalog && (
            <p className="mt-1.5 text-[11px] text-primary">
              ✓ نام علمی، نور و دور آبیاری معمول این گیاه پر شد؛ هر کدوم رو خواستی عوض کن.
            </p>
          )}
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
          <JalaliDateInput value={lastWatered} onChange={setLastWatered} yearsBack={2} />
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
