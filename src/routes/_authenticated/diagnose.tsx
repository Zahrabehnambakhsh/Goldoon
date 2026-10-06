import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { sendChat, getChatHistory } from "@/lib/chat.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/diagnose")({
  head: () => ({
    meta: [
      { title: "تشخیص گیاه • Goldoon" },
      { name: "description", content: "با هوش مصنوعی گیاهت را تشخیص بده و سوال بپرس." },
    ],
  }),
  component: DiagnosePage,
});

const SESSION_ID = "main";
const SUGGESTIONS = ["چه بیماری‌ای داره؟", "چطور نگهداری کنم؟", "چقدر آب نیاز داره؟"];

function DiagnosePage() {
  const qc = useQueryClient();
  const sendFn = useServerFn(sendChat);
  const historyFn = useServerFn(getChatHistory);

  const [input, setInput] = useState("");
  const [image, setImage] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const { data: messages = [] } = useQuery({
    queryKey: ["chat", SESSION_ID],
    queryFn: () => historyFn({ data: { session_id: SESSION_ID } }),
  });

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, sending]);

  const send = async (text: string, imgOverride?: string | null) => {
    const msg = text.trim();
    const img = imgOverride ?? image;
    if (!msg && !img) return;
    setSending(true);
    setInput("");
    setImage(null);
    try {
      await sendFn({
        data: {
          session_id: SESSION_ID,
          message: msg || "این گیاه چیست و چه مشکلاتی دارد؟",
          image_url: img,
        },
      });
      qc.invalidateQueries({ queryKey: ["chat", SESSION_ID] });
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "خطا");
    } finally {
      setSending(false);
    }
  };

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const url = reader.result as string;
      setImage(url);
      // Auto-send diagnose request
      send("این گیاه چیست و چه مشکلاتی دارد؟ به فارسی پاسخ بده.", url);
    };
    reader.readAsDataURL(f);
  };

  return (
    <div className="flex min-h-screen flex-col px-5 pt-6">
      <h1 className="mb-4 text-center text-lg font-bold text-primary">تشخیص هوشمند 🌱</h1>

      {/* Upload */}
      <label className="mb-4 block cursor-pointer">
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <div className="grid h-40 place-items-center rounded-3xl bg-primary text-primary-foreground shadow-soft overflow-hidden">
          {image ? (
            <img src={image} alt="گیاه" className="size-full object-cover" />
          ) : (
            <div className="flex flex-col items-center gap-2">
              <Camera className="size-8" />
              <p className="text-sm">عکس گیاه را آپلود کن</p>
              <span className="rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs backdrop-blur-md">
                انتخاب عکس
              </span>
            </div>
          )}
        </div>
      </label>

      {/* Chat */}
      <div
        ref={scrollRef}
        className="mb-4 flex-1 space-y-2.5 overflow-y-auto rounded-2xl bg-card/50 p-3 max-h-[45vh]"
      >
        {messages.length === 0 && !sending && (
          <p className="py-6 text-center text-sm text-muted-foreground">
            یه عکس آپلود کن یا سوالت رو بپرس!
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex ${m.role === "user" ? "justify-start" : "justify-end"}`}
          >
            <div
              className={`max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground"
                  : "border border-border bg-card text-primary"
              }`}
            >
              {m.image_url && (
                <img src={m.image_url} alt="" className="mb-2 max-h-40 rounded-xl" />
              )}
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {sending && (
          <div className="flex justify-end">
            <div className="rounded-2xl border border-border bg-card px-4 py-2.5 text-sm text-muted-foreground">
              در حال فکر کردن...
            </div>
          </div>
        )}
      </div>

      {/* Suggestions */}
      <div className="mb-3 flex flex-wrap gap-2">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => send(s)}
            disabled={sending}
            className="rounded-full border border-border bg-card px-3 py-1.5 text-xs text-primary shadow-soft disabled:opacity-50"
          >
            {s}
          </button>
        ))}
      </div>

      {/* Input */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="flex items-center gap-2"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="سوالت رو بپرس..."
          className="flex-1 rounded-full border border-border bg-card px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          disabled={sending}
          type="submit"
          className="grid size-11 place-items-center rounded-full bg-primary text-primary-foreground shadow-soft disabled:opacity-50"
        >
          <Send className="size-4 -rotate-180" />
        </button>
      </form>
    </div>
  );
}
