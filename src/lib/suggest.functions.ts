import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";
import { getAiModel } from "./ai-gateway.server";

const Input = z.object({
  name: z.string().min(1).max(80),
  latin_name: z.string().max(120).optional().nullable(),
  type: z.string().max(40).optional().nullable(),
  light_level: z.enum(["low", "medium", "high"]).optional().nullable(),
});

export const suggestWateringInterval = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }) => {
    const model = getAiModel();

    const prompt = `به عنوان یک متخصص گیاه‌شناس، بر اساس اطلاعات زیر دور آبیاری مناسب (تعداد روز بین هر آبیاری) را پیشنهاد بده.
- نام گیاه: ${data.name}
- نام علمی: ${data.latin_name ?? "نامشخص"}
- نوع: ${data.type ?? "نامشخص"}
- میزان نور: ${data.light_level ?? "نامشخص"}

فقط یک عدد بین ۱ تا ۶۰ روز و یک توضیح کوتاه فارسی (حداکثر ۱۲۰ کاراکتر) بده.`;

    const clamp = (d: unknown, r: unknown) => ({
      days: Math.min(60, Math.max(1, Math.round(Number(d)) || 7)),
      reason:
        typeof r === "string" && r.trim() ? r.slice(0, 200) : "پیشنهاد عمومی بر اساس نوع گیاه",
    });

    try {
      const { output } = await generateText({
        model,
        prompt,
        output: Output.object({
          schema: z.object({
            days: z.number(),
            reason: z.string(),
          }),
        }),
      });
      return clamp(output.days, output.reason);
    } catch {
      // fallback: plain text + manual JSON parse
      const { text } = await generateText({
        model,
        prompt: `${prompt}\n\nفقط JSON خالص با این شکل برگردان: {"days": number, "reason": string}`,
      });
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          const parsed = JSON.parse(match[0]);
          return clamp(parsed.days, parsed.reason);
        } catch {
          /* ignore */
        }
      }
      const num = text.match(/\d+/);
      return clamp(num?.[0], text.replace(/\s+/g, " ").trim());
    }
  });
