import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { generateText, Output } from "ai";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";

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
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3.6-flash");

    const prompt = `به عنوان یک متخصص گیاه‌شناس، بر اساس اطلاعات زیر دور آبیاری مناسب (تعداد روز بین هر آبیاری) را پیشنهاد بده.
- نام گیاه: ${data.name}
- نام علمی: ${data.latin_name ?? "نامشخص"}
- نوع: ${data.type ?? "نامشخص"}
- میزان نور: ${data.light_level ?? "نامشخص"}

فقط یک عدد بین ۱ تا ۶۰ روز و یک توضیح کوتاه فارسی (حداکثر ۱۲۰ کاراکتر) بده.`;

    const { output } = await generateText({
      model,
      prompt,
      output: Output.object({
        schema: z.object({
          days: z.number().int().min(1).max(60),
          reason: z.string().max(200),
        }),
      }),
    });

    return output;
  });
