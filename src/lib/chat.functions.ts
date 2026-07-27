import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { createLovableAiGatewayProvider } from "./ai-gateway.server";
import { generateText } from "ai";

const SYSTEM_PROMPT =
  "تو یک متخصص گیاه‌شناس دلسوز هستی. به سوالات کاربر درباره گیاهان کاملاً به زبان فارسی پاسخ بده. اگر عکسی همراه پیام هست، آن را با دقت تحلیل کن و نام گیاه، وضعیت سلامت، بیماری‌های احتمالی و راهکار مراقبت را بگو. پاسخ‌هایت را کوتاه، دوستانه و کاربردی نگه دار.";

const ChatInput = z.object({
  session_id: z.string().min(1).max(64),
  message: z.string().min(1).max(2000),
  image_url: z.string().max(2_000_000).optional().nullable(),
});

export const sendChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data, context }) => {
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    // Persist user msg
    await context.supabase.from("chat_messages").insert({
      user_id: context.userId,
      session_id: data.session_id,
      role: "user",
      content: data.message,
      image_url: data.image_url ?? null,
    });

    // Load history
    const { data: history } = await context.supabase
      .from("chat_messages")
      .select("role, content, image_url")
      .eq("user_id", context.userId)
      .eq("session_id", data.session_id)
      .order("created_at", { ascending: true })
      .limit(30);

    const messages: Array<{ role: "system" | "user" | "assistant"; content: unknown }> = [
      { role: "system", content: SYSTEM_PROMPT },
    ];
    for (const m of history ?? []) {
      if (m.role === "user" && m.image_url) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: m.content },
            { type: "image", image: m.image_url },
          ],
        });
      } else {
        messages.push({ role: m.role as "user" | "assistant", content: m.content });
      }
    }

    const gateway = createLovableAiGatewayProvider(key);
    const model = gateway("google/gemini-3.6-flash");

    try {
      const { text } = await generateText({
        model,
        // @ts-expect-error - multimodal messages typed loosely
        messages,
      });

      await context.supabase.from("chat_messages").insert({
        user_id: context.userId,
        session_id: data.session_id,
        role: "assistant",
        content: text,
      });

      return { text };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "خطا در دریافت پاسخ";
      throw new Error(msg);
    }
  });

export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ session_id: z.string().min(1).max(64) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, image_url, created_at")
      .eq("user_id", context.userId)
      .eq("session_id", data.session_id)
      .order("created_at", { ascending: true });
    return rows ?? [];
  });
