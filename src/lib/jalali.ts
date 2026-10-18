// Jalali (Shamsi) <-> Gregorian conversion built on the browser's own Persian calendar (Intl),
// so there is no date library to ship. Dates travel through the app as ISO "YYYY-MM-DD" strings.

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
];

export type Jalali = { y: number; m: number; d: number };

const jalaliParts = new Intl.DateTimeFormat("en-US-u-ca-persian-nu-latn", {
  timeZone: "UTC",
  year: "numeric",
  month: "numeric",
  day: "numeric",
});

// Noon UTC keeps the calendar day stable whatever the device's time zone is.
const utcNoon = (y: number, m: number, d: number) => new Date(Date.UTC(y, m - 1, d, 12));

function fromDate(date: Date): Jalali {
  const parts = Object.fromEntries(jalaliParts.formatToParts(date).map((p) => [p.type, p.value]));
  return { y: Number(parts.year), m: Number(parts.month), d: Number(parts.day) };
}

const ordinal = (j: Jalali) => j.y * 372 + (j.m - 1) * 31 + j.d;

export function isoToJalali(iso: string): Jalali | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return null;
  return fromDate(utcNoon(Number(match[1]), Number(match[2]), Number(match[3])));
}

export function jalaliToIso({ y, m, d }: Jalali): string {
  // Start from an estimate (Nowruz falls around 21 March) and walk to the exact day.
  const date = utcNoon(y + 621, 3, 21);
  date.setUTCDate(date.getUTCDate() + Math.round((m - 1) * 30.5 + d - 1));
  for (let i = 0; i < 10; i++) {
    const diff = ordinal({ y, m, d }) - ordinal(fromDate(date));
    if (diff === 0) break;
    date.setUTCDate(
      date.getUTCDate() + Math.sign(diff) * Math.max(1, Math.floor(Math.abs(diff) * 0.9)),
    );
  }
  return date.toISOString().slice(0, 10);
}

export function jalaliMonthLength(y: number, m: number): number {
  if (m <= 6) return 31;
  if (m <= 11) return 30;
  // Esfand has 30 days only in a leap year: day 30 must round-trip to the same Jalali date.
  const back = isoToJalali(jalaliToIso({ y, m: 12, d: 30 }));
  return back && back.y === y && back.m === 12 && back.d === 30 ? 30 : 29;
}

export function todayIsoLocal(now = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
}
