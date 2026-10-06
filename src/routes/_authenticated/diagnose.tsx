import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { HeroPlant } from "@/components/flat-art";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Send, Sparkles } from "lucide-react";
import { Foliage } from "@/components/foliage";
import { BackButton, Segmented } from "@/components/garden-ui";
import { useEffect, useRef, useState } from "react";
import { sendChat, getChatHistory } from "@/lib/chat.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/diagnose")({
  head: () => ({
    meta: [
      { title: "Goldoon" },
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
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

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
    <div className="flex min-h-screen flex-col px-4 pt-[18px]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <BackButton onClick={() => navigate({ to: "/home" })} />
        <Segmented
          value="photo"
          options={[
            { value: "photo", label: "عکس" },
            { value: "chat", label: "گفتگو" },
          ]}
          onChange={(v) => {
            if (v === "chat") inputRef.current?.focus();
          }}
        />
      </header>
      <h1 className="mb-3.5 text-2xl font-extrabold">تشخیص هوشمند</h1>

      {/* Upload */}
      <label className="mb-3.5 block cursor-pointer">
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
        <div className="relative grid h-[230px] place-items-center overflow-hidden rounded-[30px] hero-sand">
          {image ? (
            <img src={image} alt="گیاه" className="absolute inset-0 size-full object-cover" />
          ) : (
            <>
              <Foliage />
              <div className="absolute right-3.5 top-3.5 flex gap-1.5">
                <span className="rounded-full bg-lilac px-2.5 py-0.5 text-[11px] font-medium">
                  برگ
                </span>
                <span className="rounded-full bg-brand-100 px-2.5 py-0.5 text-[11px] font-medium">
                  خاک
                </span>
                <span className="rounded-full bg-warn-soft px-2.5 py-0.5 text-[11px] font-medium text-warn-ink">
                  آفت
                </span>
              </div>
              <HeroPlant className="relative size-[150px]" />
            </>
          )}
          <span className="absolute bottom-3.5 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full border border-white bg-white/80 px-4 py-2 text-[13px] font-semibold text-primary backdrop-blur">
            <Camera className="size-4" />
            {image ? "عکس دیگه" : "عکس گیاه را آپلود کن"}
          </span>
        </div>
      </label>

      {/* Chat */}
      <div
        ref={scrollRef}
        className="glass-card mb-3 flex max-h-[42vh] min-h-[150px] flex-1 flex-col gap-2.5 overflow-y-auto rounded-[30px] p-3.5"
      >
        {messages.length === 0 && !sending && (
          <p className="m-auto text-center text-sm text-muted-foreground">
            یه عکس آپلود کن یا سوالت رو بپرس!
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.id}
            className={`max-w-[82%] rounded-[20px] px-3.5 py-2.5 text-sm ${
              m.role === "user"
                ? "self-start rounded-tr-md bg-primary text-primary-foreground"
                : "self-end rounded-tl-md border border-[#E3ECE4] bg-white"
            }`}
          >
            {m.image_url && <img src={m.image_url} alt="" className="mb-2 max-h-40 rounded-2xl" />}
            <p className="whitespace-pre-wrap">{m.content}</p>
          </div>
        ))}
        {sending && (
          <div className="self-end rounded-[20px] rounded-tl-md border border-[#E3ECE4] bg-white px-4 py-2.5 text-sm text-muted-foreground">
            در حال فکر کردن...
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
            className="glass-card rounded-full px-3.5 py-1.5 text-xs font-medium disabled:opacity-50"
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
        className="glass-card mb-4 flex items-center gap-2 rounded-full py-1.5 pe-1.5 ps-4"
      >
        <Sparkles className="size-4 shrink-0 text-[#E3A23A]" />
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="سوالت رو بپرس..."
          className="min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
        />
        <button
          disabled={sending}
          type="submit"
          aria-label="ارسال"
          className="grid size-[42px] shrink-0 place-items-center rounded-full bg-primary text-primary-foreground disabled:opacity-50"
        >
          <Send className="size-4 -scale-x-100" />
        </button>
      </form>
    </div>
  );
}
