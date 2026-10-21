import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { aiTuning, getAiModel } from "./ai-gateway.server";
import { generateText } from "ai";

const SYSTEM_PROMPT =
  "تو یک متخصص گیاه‌شناس دلسوز هستی. به سوالات کاربر درباره گیاهان کاملاً به زبان فارسی پاسخ بده. اگر عکسی همراه پیام هست، آن را با دقت تحلیل کن و نام گیاه، وضعیت سلامت، بیماری‌های احتمالی و راهکار مراقبت را بگو. پاسخ‌هایت را کوتاه، دوستانه و کاربردی نگه دار. از Markdown (مثل ** یا #) استفاده نکن و متن ساده بنویس؛ برای فهرست از شماره‌های ۱، ۲، ۳ استفاده کن.";

const ChatInput = z.object({
  session_id: z.string().min(1).max(64),
  message: z.string().min(1).max(2000),
  image_url: z.string().max(2_000_000).optional().nullable(),
});

export const sendChat = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => ChatInput.parse(input))
  .handler(async ({ data, context }) => {
    const model = getAiModel();

    // Daily cap per user: everyone shares one AI key, so this keeps the bill predictable.
    const limit = Number(process.env.AI_DAILY_LIMIT) || 30;
    const dayStart = new Date();
    dayStart.setUTCHours(0, 0, 0, 0);
    const { count: usedToday } = await context.supabase
      .from("chat_messages")
      .select("id", { count: "exact", head: true })
      .eq("user_id", context.userId)
      .eq("role", "user")
      .gte("created_at", dayStart.toISOString());
    if ((usedToday ?? 0) >= limit) {
      throw new Error("سهمیهٔ امروزِ سوال از هوش مصنوعی تموم شد؛ فردا دوباره امتحان کن 🌱");
    }

    // Persist user msg
    const { error: insertError } = await context.supabase.from("chat_messages").insert({
      user_id: context.userId,
      session_id: data.session_id,
      role: "user",
      content: data.message,
      image_url: data.image_url ?? null,
    });
    if (insertError) console.error("[chat] could not save message", insertError.message);

    // Latest 12 messages (newest first from the DB, then back to chronological order).
    const { data: recent } = await context.supabase
      .from("chat_messages")
      .select("role, content, image_url")
      .eq("user_id", context.userId)
      .eq("session_id", data.session_id)
      .order("created_at", { ascending: false })
      .limit(12);
    const history = (recent ?? []).reverse();
    // If saving failed, still answer the message that was just sent.
    if (insertError || history.length === 0) {
      history.push({ role: "user", content: data.message, image_url: data.image_url ?? null });
    }

    // Only the two most recent photos go to the model; older ones become a short note.
    let imagesLeft = 2;
    const withImage = new Set<number>();
    for (let i = history.length - 1; i >= 0 && imagesLeft > 0; i--) {
      if (history[i].role === "user" && history[i].image_url) {
        withImage.add(i);
        imagesLeft--;
      }
    }

    const messages: Array<{ role: "user" | "assistant"; content: unknown }> = [];
    history.forEach((m, i) => {
      if (m.role === "user" && m.image_url && withImage.has(i)) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: m.content },
            { type: "image", image: m.image_url },
          ],
        });
      } else if (m.role === "user" && m.image_url) {
        messages.push({ role: "user", content: `${m.content}\n(یک عکس قبلاً فرستاده شده بود)` });
      } else {
        messages.push({ role: m.role as "user" | "assistant", content: m.content });
      }
    });

    try {
      const { text } = await generateText({
        model,
        instructions: SYSTEM_PROMPT,
        // The prompt asks for short answers; a cap keeps a rambling reply from taking ages.
        maxOutputTokens: 700,
        ...aiTuning(),
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
      console.error("[chat] AI request failed", err);
      throw new Error("پاسخ هوش مصنوعی دریافت نشد؛ کمی بعد دوباره امتحان کن");
    }
  });

export const getChatHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .validator((input: unknown) => z.object({ session_id: z.string().min(1).max(64) }).parse(input))
  .handler(async ({ data, context }) => {
    const { data: rows } = await context.supabase
      .from("chat_messages")
      .select("id, role, content, image_url, created_at")
      .eq("user_id", context.userId)
      .eq("session_id", data.session_id)
      .order("created_at", { ascending: true });
    return rows ?? [];
  });
