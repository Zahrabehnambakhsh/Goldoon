import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { KeyRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// The password-reset email links here; Supabase signs the user in from the link first.
export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "رمز جدید • Goldoon" },
      { name: "description", content: "ساختن رمز عبور جدید." },
    ],
  }),
  component: ResetPasswordPage,
});

const INPUT =
  "w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary";

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState<"checking" | "ok" | "invalid">("checking");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) setReady("ok");
    });
    supabase.auth.getSession().then(({ data: s }) => {
      setReady(s.session ? "ok" : (r) => (r === "ok" ? "ok" : "invalid"));
    });
    return () => data.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("رمز عبور باید حداقل ۶ کاراکتر باشه");
    if (pw !== pw2) return toast.error("دو رمز با هم یکی نیستن");
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      toast.success("رمز جدید ذخیره شد");
      navigate({ to: "/home", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col justify-center gap-3.5 px-4 py-6">
      <div className="glass-card rounded-[30px] p-[18px]">
        <span className="mb-3 grid size-14 place-items-center rounded-full bg-brand-100 text-primary">
          <KeyRound className="size-6" />
        </span>
        <h1 className="mb-1 text-xl font-extrabold">رمز عبور جدید</h1>

        {ready === "checking" && (
          <p className="text-sm text-muted-foreground">در حال بررسی لینک...</p>
        )}

        {ready === "invalid" && (
          <div className="space-y-3.5">
            <p className="text-sm leading-7 text-muted-foreground">
              این لینک نامعتبره یا منقضی شده. از صفحهٔ ورود دوباره «فراموشی رمز» رو بزن.
            </p>
            <button
              onClick={() => navigate({ to: "/auth" })}
              className="w-full rounded-full bg-primary py-[15px] text-[15px] font-semibold text-primary-foreground"
            >
              رفتن به صفحهٔ ورود
            </button>
          </div>
        )}

        {ready === "ok" && (
          <form onSubmit={submit} className="mt-3 space-y-3.5">
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold">رمز جدید</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={pw}
                onChange={(e) => setPw(e.target.value)}
                className={INPUT}
                placeholder="حداقل ۶ کاراکتر"
              />
            </label>
            <label className="block">
              <span className="mb-2 block text-[13px] font-semibold">تکرار رمز جدید</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={pw2}
                onChange={(e) => setPw2(e.target.value)}
                className={INPUT}
              />
            </label>
            <button
              disabled={loading}
              type="submit"
              className="w-full rounded-full bg-primary py-[15px] text-[15px] font-semibold text-primary-foreground shadow-soft transition hover:bg-brand-900 disabled:opacity-60"
            >
              {loading ? "در حال ذخیره..." : "ذخیرهٔ رمز"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
