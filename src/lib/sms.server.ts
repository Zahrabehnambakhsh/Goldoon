import { createHmac, timingSafeEqual } from "node:crypto";

// ---------- Kavenegar ----------
// KAVENEGAR_API_KEY  (required)
// KAVENEGAR_TEMPLATE (recommended) name of an approved "verify" template whose %token% is the code
// KAVENEGAR_SENDER   (fallback when no template) sender line number for a plain text SMS

export async function sendOtpSms(phone: string, code: string): Promise<void> {
  const apiKey = process.env.KAVENEGAR_API_KEY;
  if (!apiKey) throw new Error("KAVENEGAR_API_KEY missing");

  const receptor = toLocal(phone);
  const template = process.env.KAVENEGAR_TEMPLATE;
  const base = `https://api.kavenegar.com/v1/${encodeURIComponent(apiKey)}`;

  let url: string;
  if (template) {
    const q = new URLSearchParams({ receptor, token: code, template });
    url = `${base}/verify/lookup.json?${q}`;
  } else {
    const q = new URLSearchParams({
      receptor,
      message: `کد ورود گلدون: ${code}\nاین کد را به کسی ندهید.`,
    });
    if (process.env.KAVENEGAR_SENDER) q.set("sender", process.env.KAVENEGAR_SENDER);
    url = `${base}/sms/send.json?${q}`;
  }

  const res = await fetch(url, { method: "POST" });
  const body = (await res.json().catch(() => null)) as {
    return?: { status?: number; message?: string };
  } | null;
  if (!res.ok || body?.return?.status !== 200) {
    throw new Error(
      `Kavenegar error: ${body?.return?.status ?? res.status} ${body?.return?.message ?? ""}`,
    );
  }
}

function toLocal(phone: string): string {
  const d = phone.replace(/\D/g, "").replace(/^98/, "");
  return `0${d}`;
}

// ---------- Supabase "Send SMS" auth hook (Standard Webhooks signature) ----------
// SEND_SMS_HOOK_SECRET: the secret Supabase shows for the hook, e.g. "v1,whsec_...."

export function verifyHookSignature(headers: Headers, payload: string): boolean {
  const secret = process.env.SEND_SMS_HOOK_SECRET;
  if (!secret) return false;
  const id = headers.get("webhook-id");
  const timestamp = headers.get("webhook-timestamp");
  const signatureHeader = headers.get("webhook-signature");
  if (!id || !timestamp || !signatureHeader) return false;

  const age = Math.abs(Date.now() / 1000 - Number(timestamp));
  if (!Number.isFinite(age) || age > 5 * 60) return false;

  const key = Buffer.from(secret.replace(/^v1,/, "").replace(/^whsec_/, ""), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${payload}`).digest();

  return signatureHeader.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const given = Buffer.from(sig, "base64");
    return given.length === expected.length && timingSafeEqual(given, expected);
  });
}
