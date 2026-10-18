import { track } from "@/lib/analytics";
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { HeroPlant } from "@/components/flat-art";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Leaf, Mail, Smartphone, ArrowRight, ArrowLeft, Lock, Eye, EyeOff } from "lucide-react";
import { Foliage } from "@/components/foliage";
import { normalizeIranMobile, toEnglishDigits, toLocalMobile } from "@/lib/phone";
import { toFa } from "@/lib/fa";
import { getPublicEnv } from "@/lib/public-env";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Goldoon" },
      { name: "description", content: "وارد حساب کاربری خود شوید یا ثبت‌نام کنید." },
    ],
  }),
  beforeLoad: async () => {
    const { data } = await supabase.auth.getSession();
    if (data.session) throw redirect({ to: "/home" });
  },
  component: AuthPage,
});

type Method = "email" | "phone";
type View = "form" | "forgot" | "check-email";

const INPUT =
  "h-[52px] w-full rounded-2xl border border-transparent bg-[#EFF5F0] px-4 text-[15px] outline-none transition placeholder:text-[#98A69D] focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10";
const PRIMARY =
  "flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground shadow-[0_10px_24px_rgba(46,90,59,0.28)] transition hover:bg-brand-900 active:scale-[0.99] disabled:opacity-60";

/** Supabase error messages → Persian. */
function faError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? "");
  const m = msg.toLowerCase();
  if (m.includes("invalid login credentials")) return "ایمیل یا رمز عبور اشتباهه";
  if (m.includes("email not confirmed")) return "ایمیلت هنوز تأیید نشده";
  if (m.includes("already registered") || m.includes("already been registered"))
    return "با این ایمیل قبلاً ثبت‌نام شده؛ وارد شو";
  if (m.includes("password should be at least")) return "رمز عبور باید حداقل ۶ کاراکتر باشه";
  if (m.includes("token has expired") || (m.includes("invalid") && m.includes("otp")))
    return "کد اشتباهه یا منقضی شده";
  if (m.includes("phone") && (m.includes("provider") || m.includes("disabled")))
    return "ورود با موبایل هنوز روی سرور فعال نشده";
  if (m.includes("provider is not enabled")) return "این روش ورود هنوز روی سرور فعال نشده";
  if (m.includes("failed to fetch") || m.includes("network"))
    return "اتصال به سرور برقرار نشد؛ اینترنتت رو چک کن";
  if (m.includes("rate limit") || m.includes("for security purposes"))
    return "تعداد درخواست‌ها زیاد شد؛ کمی بعد دوباره امتحان کن";
  return msg || "خطایی پیش اومد";
}

function AuthPage() {
  const navigate = useNavigate();
  const { signupOpen, phoneLogin, googleLogin } = getPublicEnv();
  const [method, setMethod] = useState<Method>("email");
  const [view, setView] = useState<View>("form");
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [needsConfirm, setNeedsConfirm] = useState(false);
  const [checkEmailText, setCheckEmailText] = useState("");
  const [loading, setLoading] = useState(false);

  // Phone OTP
  const [phoneInput, setPhoneInput] = useState("");
  const [phone, setPhone] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setNeedsConfirm(false);
    try {
      if (mode === "register") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password: pw,
          options: { data: { name }, emailRedirectTo: `${origin}/home` },
        });
        if (error) throw error;
        if (!data.session) {
          setCheckEmailText(`یه لینک تأیید به ${email} فرستادیم. روی لینک بزن تا حسابت فعال بشه.`);
          setView("check-email");
          return;
        }
        track("signed_up", { method: "email" });
        toast.success("ثبت‌نام موفق بود!");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password: pw });
        if (error) {
          if (error.message.toLowerCase().includes("email not confirmed")) setNeedsConfirm(true);
          throw error;
        }
        track("logged_in", { method: "email" });
        toast.success("خوش اومدی!");
      }
      navigate({ to: "/home" });
    } catch (err) {
      toast.error(faError(err));
    } finally {
      setLoading(false);
    }
  };

  const resendConfirmation = async () => {
    if (!email) return toast.error("ایمیلت رو وارد کن");
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: "signup",
        email,
        options: { emailRedirectTo: `${origin}/home` },
      });
      if (error) throw error;
      toast.success("ایمیل تأیید دوباره فرستاده شد");
    } catch (err) {
      toast.error(faError(err));
    } finally {
      setLoading(false);
    }
  };

  const sendReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${origin}/reset-password`,
      });
      if (error) throw error;
      setCheckEmailText(`اگه حسابی با ${email} وجود داشته باشه، لینک تغییر رمز براش فرستاده شد.`);
      setView("check-email");
    } catch (err) {
      toast.error(faError(err));
    } finally {
      setLoading(false);
    }
  };

  const sendCode = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const normalized = normalizeIranMobile(phoneInput);
    if (!normalized) return toast.error("شمارهٔ موبایل درست نیست (مثلاً ۰۹۱۲۱۲۳۴۵۶۷)");
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ phone: normalized });
      if (error) throw error;
      setPhone(normalized);
      setCode("");
      setCooldown(60);
      toast.success("کد ورود پیامک شد");
    } catch (err) {
      toast.error(faError(err));
    } finally {
      setLoading(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!phone) return;
    const token = toEnglishDigits(code).replace(/\D/g, "");
    if (token.length < 4) return toast.error("کد رو کامل وارد کن");
    setLoading(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ phone, token, type: "sms" });
      if (error) throw error;
      toast.success("خوش اومدی!");
      navigate({ to: "/home" });
    } catch (err) {
      toast.error(faError(err));
    } finally {
      setLoading(false);
    }
  };

  const signInWithGoogle = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${origin}/home` },
    });
    if (error) {
      toast.error(faError(error));
      setLoading(false);
    }
  };

  const title =
    view === "forgot"
      ? "فراموشی رمز عبور"
      : view === "check-email"
        ? "ایمیلت رو چک کن"
        : mode === "register"
          ? "ساخت حساب تازه"
          : "خوش اومدی";
  const subtitle =
    view === "forgot"
      ? "ایمیل حسابت رو بزن تا لینک ساختن رمز جدید برات بیاد."
      : view === "check-email"
        ? ""
        : mode === "register"
          ? "چند ثانیه‌ست؛ بعدش گیاه‌هات رو اضافه کن."
          : "وارد شو تا ببینی امروز کدوم گیاه‌ها تشنه‌ان.";

  return (
    <div className="flex min-h-screen flex-col">
      {/* Hero */}
      <section className="hero-sand relative h-[42vh] min-h-[280px] max-h-[380px] overflow-hidden rounded-b-[40px] border-x-0 border-t-0">
        <Foliage />
        <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-white bg-white/70 py-1.5 pe-4 ps-1.5 backdrop-blur">
          <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-primary">
            <Leaf className="size-4" />
          </span>
          <span className="text-sm font-extrabold">Goldoon</span>
        </div>
        <div
          aria-hidden="true"
          className="absolute left-1/2 top-[54%] size-44 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/50 blur-2xl"
        />
        <HeroPlant className="absolute left-1/2 top-[54%] size-[170px] -translate-x-1/2 -translate-y-1/2" />
      </section>

      {/* Sheet */}
      <div className="relative z-10 -mt-8 flex-1 rounded-t-[36px] bg-card px-5 pb-10 pt-7 shadow-[0_-10px_30px_rgba(46,90,64,0.06)]">
        <span
          className="mx-auto mb-5 block h-1.5 w-10 rounded-full bg-[#DCE8DE]"
          aria-hidden="true"
        />
        <h1 className="text-[26px] font-extrabold leading-tight">{title}</h1>
        {subtitle && <p className="mt-1.5 text-sm leading-6 text-muted-foreground">{subtitle}</p>}
        {!signupOpen && view === "form" && (
          <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-[11px] font-semibold text-primary">
            <Lock className="size-3" />
            فعلاً فقط برای کاربران دعوت‌شده
          </p>
        )}
        <div className="mt-6">
          {view === "check-email" ? (
            <div className="space-y-4 text-center">
              <span className="mx-auto grid size-14 place-items-center rounded-full bg-brand-100 text-primary">
                <Mail className="size-6" />
              </span>
              <p className="text-sm leading-7">{checkEmailText}</p>
              <button
                type="button"
                onClick={() => {
                  setView("form");
                  setMode("login");
                }}
                className={PRIMARY}
              >
                برگشت به ورود
              </button>
            </div>
          ) : view === "forgot" ? (
            <form onSubmit={sendReset} className="space-y-3.5">
              <button
                type="button"
                onClick={() => setView("form")}
                className="flex items-center gap-1 text-[13px] font-semibold text-muted-foreground"
              >
                <ArrowRight className="size-4" />
                برگشت
              </button>
              <Field label="ایمیل">
                <input
                  required
                  type="email"
                  dir="ltr"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={INPUT}
                  placeholder="you@example.com"
                />
              </Field>
              <button disabled={loading} type="submit" className={PRIMARY}>
                {loading ? "در حال ارسال..." : "ارسال لینک"}
              </button>
            </form>
          ) : (
            <>
              {googleLogin && (
                <>
                  <button
                    type="button"
                    onClick={signInWithGoogle}
                    disabled={loading}
                    className="mb-3.5 flex w-full items-center justify-center gap-2.5 rounded-full border border-input bg-white py-3 text-sm font-semibold transition hover:bg-[#F4F8F3] disabled:opacity-60"
                  >
                    <GoogleIcon />
                    ادامه با گوگل
                  </button>

                  <div className="mb-3.5 flex items-center gap-3 text-[11px] text-muted-foreground">
                    <span className="h-px flex-1 bg-input" />
                    یا
                    <span className="h-px flex-1 bg-input" />
                  </div>
                </>
              )}
              {signupOpen ? (
                <>
                  <div className="mb-3.5 grid grid-cols-2 gap-1 rounded-2xl bg-[#EAF2EB] p-1">
                    {(
                      [
                        ["email", "ایمیل", Mail],
                        ["phone", "موبایل", Smartphone],
                      ] as const
                    ).map(([m, label, Icon]) => {
                      // Phone login stays visible but greyed out until PHONE_LOGIN is switched on.
                      const unavailable = m === "phone" && !phoneLogin;
                      return (
                        <button
                          key={m}
                          type="button"
                          title={unavailable ? "ورود با موبایل فعلاً غیرفعاله" : undefined}
                          aria-disabled={unavailable}
                          onClick={() =>
                            unavailable
                              ? toast.info("ورود با موبایل فعلاً غیرفعاله؛ به‌زودی می‌آد")
                              : setMethod(m)
                          }
                          className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-[13px] font-semibold transition ${
                            unavailable
                              ? "cursor-not-allowed text-muted-foreground opacity-60"
                              : method === m
                                ? "bg-primary text-primary-foreground"
                                : "text-foreground"
                          }`}
                        >
                          <Icon className="size-4" />
                          {label}
                          {unavailable && (
                            <span className="text-[10px] font-medium">(به‌زودی)</span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </>
              ) : null}

              {method === "email" ? (
                <form onSubmit={handleEmailSubmit} className="space-y-3.5">
                  {signupOpen && (
                    <div className="flex gap-4 text-[13px] font-semibold">
                      {(["login", "register"] as const).map((m) => (
                        <button
                          key={m}
                          type="button"
                          onClick={() => setMode(m)}
                          className={`border-b-2 pb-1 transition ${
                            mode === m
                              ? "border-primary text-foreground"
                              : "border-transparent text-muted-foreground"
                          }`}
                        >
                          {m === "login" ? "ورود" : "ثبت‌نام"}
                        </button>
                      ))}
                    </div>
                  )}

                  {mode === "register" && (
                    <Field label="نام">
                      <input
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        className={INPUT}
                        placeholder="نام و نام خانوادگی"
                      />
                    </Field>
                  )}

                  <Field label="ایمیل">
                    <div className="relative">
                      <Mail className="pointer-events-none absolute right-4 top-1/2 size-[18px] -translate-y-1/2 text-[#98A69D]" />
                      <input
                        required
                        type="email"
                        dir="ltr"
                        autoComplete="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        className={`${INPUT} pr-11`}
                        placeholder="you@example.com"
                      />
                    </div>
                  </Field>

                  <Field label="رمز عبور">
                    <PasswordInput
                      value={pw}
                      onChange={setPw}
                      autoComplete={mode === "login" ? "current-password" : "new-password"}
                    />
                  </Field>

                  {mode === "login" && (
                    <div className="flex justify-start">
                      <button
                        type="button"
                        onClick={() => setView("forgot")}
                        className="text-xs font-semibold text-primary"
                      >
                        رمز عبور رو فراموش کردی؟
                      </button>
                    </div>
                  )}

                  {needsConfirm && (
                    <div className="rounded-2xl bg-warn-soft p-3 text-xs leading-6 text-warn-ink">
                      ایمیلت هنوز تأیید نشده. لینک تأیید رو توی ایمیلت پیدا کن یا
                      <button
                        type="button"
                        onClick={resendConfirmation}
                        disabled={loading}
                        className="ms-1 font-bold underline underline-offset-2"
                      >
                        دوباره بفرست
                      </button>
                    </div>
                  )}

                  <button disabled={loading} type="submit" className={PRIMARY}>
                    {loading ? "در حال ورود..." : mode === "login" ? "ورود به باغچه" : "ساخت حساب"}
                    {!loading && <ArrowLeft className="size-[18px]" />}
                  </button>
                </form>
              ) : phone === null ? (
                <form onSubmit={sendCode} className="space-y-3.5">
                  <Field label="شمارهٔ موبایل">
                    <input
                      required
                      type="tel"
                      inputMode="tel"
                      dir="ltr"
                      autoComplete="tel"
                      value={phoneInput}
                      onChange={(e) => setPhoneInput(e.target.value)}
                      className={INPUT}
                      placeholder="09121234567"
                    />
                  </Field>
                  <p className="text-[11px] leading-6 text-muted-foreground">
                    یه کد پیامک می‌شه. اگه قبلاً حساب نداشتی، خودکار ساخته می‌شه.
                  </p>
                  <button disabled={loading} type="submit" className={PRIMARY}>
                    {loading ? "در حال ارسال..." : "ارسال کد"}
                  </button>
                </form>
              ) : (
                <form onSubmit={verifyCode} className="space-y-3.5">
                  <p className="text-sm leading-7">
                    کد پیامک‌شده به{" "}
                    <span dir="ltr" className="font-bold fa-num">
                      {toFa(toLocalMobile(phone))}
                    </span>{" "}
                    رو وارد کن.
                  </p>
                  <input
                    required
                    autoFocus
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    dir="ltr"
                    maxLength={8}
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    className={`${INPUT} text-center text-2xl font-bold tracking-[0.5em]`}
                    placeholder="------"
                    aria-label="کد ورود"
                  />
                  <button disabled={loading} type="submit" className={PRIMARY}>
                    {loading ? "در حال بررسی..." : "ورود"}
                  </button>
                  <div className="flex items-center justify-between text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPhone(null)}
                      className="text-muted-foreground"
                    >
                      تغییر شماره
                    </button>
                    <button
                      type="button"
                      onClick={() => sendCode()}
                      disabled={cooldown > 0 || loading}
                      className="text-primary disabled:text-muted-foreground"
                    >
                      {cooldown > 0 ? `ارسال دوباره (${toFa(cooldown)})` : "ارسال دوباره کد"}
                    </button>
                  </div>
                </form>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PasswordInput({
  value,
  onChange,
  autoComplete,
}: {
  value: string;
  onChange: (v: string) => void;
  autoComplete: string;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <Lock className="pointer-events-none absolute right-4 top-1/2 size-[18px] -translate-y-1/2 text-[#98A69D]" />
      <input
        required
        minLength={6}
        type={show ? "text" : "password"}
        dir="ltr"
        autoComplete={autoComplete}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`${INPUT} pl-11 pr-11 text-right`}
        placeholder="حداقل ۶ کاراکتر"
      />
      <button
        type="button"
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "پنهان کردن رمز" : "نمایش رمز"}
        className="absolute left-3 top-1/2 grid size-8 -translate-y-1/2 place-items-center rounded-full text-[#8A9A90] hover:bg-black/5"
      >
        {show ? <EyeOff className="size-[18px]" /> : <Eye className="size-[18px]" />}
      </button>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-2 block text-[13px] font-semibold">{label}</span>
      {children}
    </label>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 48 48" className="size-5" aria-hidden="true">
      <path
        fill="#FFC107"
        d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
      />
      <path
        fill="#FF3D00"
        d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"
      />
      <path
        fill="#4CAF50"
        d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"
      />
      <path
        fill="#1976D2"
        d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"
      />
    </svg>
  );
}
