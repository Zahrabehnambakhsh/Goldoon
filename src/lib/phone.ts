// Iranian mobile numbers: accepts 0912…, 912…, +98912…, 0098912… and Persian/Arabic digits.

const FA_AR_DIGITS = /[۰-۹٠-٩]/g;

export function toEnglishDigits(s: string): string {
  return s.replace(FA_AR_DIGITS, (d) => {
    const code = d.charCodeAt(0);
    return String(code >= 0x06f0 ? code - 0x06f0 : code - 0x0660);
  });
}

/** Returns the number in E.164 form (+989xxxxxxxxx), or null if it is not an Iranian mobile. */
export function normalizeIranMobile(input: string): string | null {
  let d = toEnglishDigits(input).replace(/[\s\-()]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  if (d.startsWith("0098")) d = d.slice(4);
  else if (d.startsWith("98")) d = d.slice(2);
  else if (d.startsWith("0")) d = d.slice(1);
  return /^9\d{9}$/.test(d) ? `+98${d}` : null;
}

/** +989121234567 → 09121234567 */
export function toLocalMobile(e164: string): string {
  const d = e164.replace(/^\+?98/, "");
  return `0${d}`;
}
