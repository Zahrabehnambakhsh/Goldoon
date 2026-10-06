import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Leaf } from "lucide-react";
import { Foliage } from "@/components/foliage";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ورود • Goldoon" },
      { name: "description", content: "وارد حساب کاربری خود شوید یا ثبت‌نام کنید." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/home" });
  },
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = mode === "login" ? "ورود • Goldoon" : "ثبت‌نام • Goldoon";
  }, [mode]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "register") {
        const { error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/home`,
          },
        });
        if (error) throw error;
        toast.success("ثبت‌نام موفق بود!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) throw error;
        toast.success("خوش اومدی!");
      }
      navigate({ to: "/home" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ورود");
    } finally {
      setLoading(false);
    }
  };

  const input =
    "w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary";

  return (
    <div className="flex min-h-screen flex-col gap-3.5 px-4 py-6">
      <section className="hero-sand relative flex min-h-[300px] flex-col overflow-hidden rounded-[34px] px-5 pt-[22px]">
        <Foliage />
        <div className="relative mb-3.5 grid size-14 place-items-center rounded-[18px] bg-night text-white">
          <Leaf className="size-7" />
        </div>
        <h1 className="relative text-[34px] font-extrabold leading-tight">Goldoon</h1>
        <p className="relative mt-1 text-[15px]">گیاهانت رو هوشمند نگه‌دار</p>
      </section>

      <form onSubmit={handleSubmit} className="glass-card rounded-[30px] p-[18px]">
        <div className="mb-3.5 flex rounded-2xl bg-[#F1EADC] p-1">
          {(["login", "register"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`flex-1 rounded-xl py-2 text-[13px] font-semibold transition ${
                mode === m ? "bg-primary text-primary-foreground" : "text-foreground"
              }`}
            >
              {m === "login" ? "ورود" : "ثبت‌نام"}
            </button>
          ))}
        </div>

        <div className="space-y-3.5">
          {mode === "register" && (
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold">نام</span>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={input}
                placeholder="نام و نام خانوادگی"
              />
            </label>
          )}

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold">ایمیل</span>
            <input
              required
              type="email"
              dir="ltr"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={input}
              placeholder="you@example.com"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-[13px] font-semibold">رمز عبور</span>
            <input
              required
              minLength={6}
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              className={input}
              placeholder="حداقل ۶ کاراکتر"
            />
          </label>

          <button
            disabled={loading}
            type="submit"
            className="w-full rounded-full bg-primary py-[15px] text-[15px] font-semibold text-primary-foreground shadow-soft transition hover:bg-brand-900 disabled:opacity-60"
          >
            {loading ? "در حال ارسال..." : mode === "login" ? "ورود" : "ثبت‌نام"}
          </button>
        </div>
      </form>
    </div>
  );
}
