import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Leaf } from "lucide-react";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "ورود • مراقبت آینده گیاه" },
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
    document.title = mode === "login" ? "ورود • مراقبت آینده گیاه" : "ثبت‌نام • مراقبت آینده گیاه";
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

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 py-10">
      <div className="mb-6 flex flex-col items-center gap-3">
        <div className="grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
          <Leaf className="size-8" />
        </div>
        <h1 className="text-2xl font-bold text-primary">مراقبت آینده گیاه</h1>
        <p className="text-sm text-muted-foreground">گیاهانت رو هوشمند نگه‌دار</p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="w-full rounded-3xl bg-card p-6 shadow-soft border border-border/60"
      >
        <div className="mb-4 flex rounded-full bg-muted p-1">
          <button
            type="button"
            onClick={() => setMode("login")}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
              mode === "login" ? "bg-primary text-primary-foreground" : "text-primary"
            }`}
          >
            ورود
          </button>
          <button
            type="button"
            onClick={() => setMode("register")}
            className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
              mode === "register" ? "bg-primary text-primary-foreground" : "text-primary"
            }`}
          >
            ثبت‌نام
          </button>
        </div>

        {mode === "register" && (
          <label className="mb-3 block">
            <span className="mb-1 block text-sm font-medium">نام</span>
            <input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
              placeholder="نام و نام خانوادگی"
            />
          </label>
        )}

        <label className="mb-3 block">
          <span className="mb-1 block text-sm font-medium">ایمیل</span>
          <input
            required
            type="email"
            dir="ltr"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            placeholder="you@example.com"
          />
        </label>

        <label className="mb-5 block">
          <span className="mb-1 block text-sm font-medium">رمز عبور</span>
          <input
            required
            minLength={6}
            type="password"
            value={pw}
            onChange={(e) => setPw(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-4 py-3 text-sm outline-none focus:border-primary"
            placeholder="حداقل ۶ کاراکتر"
          />
        </label>

        <button
          disabled={loading}
          type="submit"
          className="w-full rounded-full bg-primary py-3 text-sm font-semibold text-primary-foreground shadow-soft transition hover:bg-brand-800 disabled:opacity-60"
        >
          {loading ? "در حال ارسال..." : mode === "login" ? "ورود" : "ثبت‌نام"}
        </button>
      </form>
    </div>
  );
}
