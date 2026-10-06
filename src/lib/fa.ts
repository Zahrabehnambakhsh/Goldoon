// Persian numeral helpers
const FA = ["۰", "۱", "۲", "۳", "۴", "۵", "۶", "۷", "۸", "۹"];

export function toFa(input: number | string): string {
  return String(input).replace(/[0-9]/g, (d) => FA[Number(d)]);
}

export function faDate(d: Date): string {
  return toFa(
    new Intl.DateTimeFormat("fa-IR", { day: "numeric", month: "long", year: "numeric" }).format(d),
  );
}

export function daysBetween(a: Date, b: Date): number {
  const ms = 24 * 60 * 60 * 1000;
  return Math.floor(
    (Date.UTC(a.getFullYear(), a.getMonth(), a.getDate()) -
      Date.UTC(b.getFullYear(), b.getMonth(), b.getDate())) /
      ms,
  );
}

export function plantEmoji(type?: string | null): string {
  switch (type) {
    case "cactus":
      return "🌵";
    case "garden":
      return "🌻";
    case "aquatic":
      return "🪷";
    default:
      return "🪴";
  }
}

/** YYYY-MM-DD in the device's local time zone. */
export function localIso(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** Consecutive days with at least one watering, ending today (or yesterday if none yet today). */
export function wateringStreak(dates: string[], today = new Date()): number {
  const set = new Set(dates);
  const d = new Date(today);
  if (!set.has(localIso(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  while (set.has(localIso(d))) {
    n++;
    d.setDate(d.getDate() - 1);
  }
  return n;
}
