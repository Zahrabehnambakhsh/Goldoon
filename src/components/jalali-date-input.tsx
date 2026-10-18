import { useEffect, useState } from "react";
import { toFa } from "@/lib/fa";
import {
  JALALI_MONTHS,
  isoToJalali,
  jalaliMonthLength,
  jalaliToIso,
  todayIsoLocal,
} from "@/lib/jalali";

type Props = {
  /** ISO "YYYY-MM-DD", or "" when empty (only possible with `optional`). */
  value: string;
  onChange: (iso: string) => void;
  /** Latest selectable day (ISO). Defaults to today. */
  max?: string;
  /** How many Jalali years back the year list goes. */
  yearsBack?: number;
  /** Lets the field stay empty (e.g. birth date). */
  optional?: boolean;
  className?: string;
};

const SELECT =
  "w-full rounded-2xl border border-input bg-white px-3 py-3 text-sm outline-none focus:border-primary";

/** Day / month / year dropdowns in the Persian calendar. Emits Gregorian ISO strings. */
export function JalaliDateInput({
  value,
  onChange,
  max,
  yearsBack = 3,
  optional = false,
  className = "",
}: Props) {
  const maxIso = max ?? todayIsoLocal();
  const maxJ = isoToJalali(maxIso)!;
  const fromValue = isoToJalali(value);

  // Kept locally so a half-filled birth date does not get wiped while the user picks.
  const [y, setY] = useState(fromValue?.y ?? (optional ? 0 : maxJ.y));
  const [m, setM] = useState(fromValue?.m ?? (optional ? 0 : maxJ.m));
  const [d, setD] = useState(fromValue?.d ?? (optional ? 0 : maxJ.d));

  useEffect(() => {
    const j = isoToJalali(value);
    if (j) {
      setY(j.y);
      setM(j.m);
      setD(j.d);
    }
  }, [value]);

  const emit = (ny: number, nm: number, nd: number) => {
    setY(ny);
    setM(nm);
    setD(nd);
    if (!ny || !nm || !nd) return;
    const day = Math.min(nd, jalaliMonthLength(ny, nm));
    let iso = jalaliToIso({ y: ny, m: nm, d: day });
    if (iso > maxIso) iso = maxIso; // no dates in the future
    const j = isoToJalali(iso)!;
    setY(j.y);
    setM(j.m);
    setD(j.d);
    onChange(iso);
  };

  const years = Array.from({ length: yearsBack + 1 }, (_, i) => maxJ.y - i);
  if (y && !years.includes(y)) years.push(y);
  years.sort((a, b) => b - a);
  const monthLength = y && m ? jalaliMonthLength(y, m) : 31;

  return (
    <div className={`grid grid-cols-[1fr_1.5fr_1.2fr] gap-2 ${className}`}>
      <select
        aria-label="روز"
        value={d || ""}
        onChange={(e) => emit(y, m, Number(e.target.value))}
        className={SELECT}
      >
        {optional && <option value="">روز</option>}
        {Array.from({ length: monthLength }, (_, i) => i + 1).map((n) => (
          <option key={n} value={n}>
            {toFa(n)}
          </option>
        ))}
      </select>
      <select
        aria-label="ماه"
        value={m || ""}
        onChange={(e) => emit(y, Number(e.target.value), d)}
        className={SELECT}
      >
        {optional && <option value="">ماه</option>}
        {JALALI_MONTHS.map((name, i) => (
          <option key={name} value={i + 1}>
            {name}
          </option>
        ))}
      </select>
      <select
        aria-label="سال"
        value={y || ""}
        onChange={(e) => emit(Number(e.target.value), m, d)}
        className={SELECT}
      >
        {optional && <option value="">سال</option>}
        {years.map((n) => (
          <option key={n} value={n}>
            {toFa(n)}
          </option>
        ))}
      </select>
    </div>
  );
}
