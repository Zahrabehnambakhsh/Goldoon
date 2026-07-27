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
