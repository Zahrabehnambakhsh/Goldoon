import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { Save, Gift, Cake, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BackButton, Segmented } from "@/components/garden-ui";
import { getProfile, updateProfile } from "@/lib/plants.functions";
import { toFa } from "@/lib/fa";
import { toast } from "sonner";

function birthdayDiscount(birthDate: string | null | undefined): {
  percent: number;
  daysUntil: number | null;
  tier: string;
} {
  if (!birthDate || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return { percent: 10, daysUntil: null, tier: "پایه (وفاداری)" };
  }
  const [_, m, d] = birthDate.split("-").map(Number);
  const now = new Date();
  let next = new Date(now.getFullYear(), m - 1, d);
  if (next < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
    next = new Date(now.getFullYear() + 1, m - 1, d);
  }
  const ms = 24 * 60 * 60 * 1000;
  const daysUntil = Math.round(
    (next.getTime() - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / ms,
  );
  if (daysUntil === 0) return { percent: 40, daysUntil, tier: "روز تولد" };
  if (daysUntil <= 7) return { percent: 25, daysUntil, tier: "هفته تولد" };
  if (daysUntil <= 30) return { percent: 15, daysUntil, tier: "ماه تولد" };
  return { percent: 10, daysUntil, tier: "پایه (وفاداری)" };
}

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "Goldoon" },
      { name: "description", content: "نام، تاریخ تولد و شماره تماس خود را ویرایش کنید." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({
      queryKey: ["profile"],
      queryFn: () => getProfile(),
    });
  },
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery({
    queryKey: ["profile"],
    queryFn: () => getProfile(),
  });

  const p = profile as {
    name?: string;
    display_name?: string | null;
    family_name?: string | null;
    birth_date?: string | null;
    phone?: string | null;
  } | null;

  const [name, setName] = useState(p?.name ?? "");
  const [callName, setCallName] = useState(p?.display_name ?? "");
  const [familyName, setFamilyName] = useState(p?.family_name ?? "");
  const [birthDate, setBirthDate] = useState(p?.birth_date ?? "");
  const [phone, setPhone] = useState(p?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const discount = useMemo(() => birthdayDiscount(birthDate), [birthDate]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("نام را وارد کنید");
      return;
    }
    setSaving(true);
    try {
      await updateProfile({
        data: {
          name: name.trim(),
          ...(callName.trim() ? { display_name: callName.trim() } : {}),
          family_name: familyName.trim() || null,
          birth_date: birthDate || null,
          phone: phone.trim() || null,
        },
      });
      await qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success("اطلاعات ذخیره شد");
      navigate({ to: "/profile" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="px-4 pt-[18px]">
      <header className="mb-5 flex items-center justify-between gap-3">
        <BackButton onClick={() => navigate({ to: "/profile" })} />
        <Segmented value="account" options={[{ value: "account", label: "حساب" }]} />
      </header>
      <h1 className="mb-3.5 text-2xl font-extrabold">اطلاعات حساب</h1>

      <p className="mb-3.5 rounded-3xl bg-brand-100 p-3.5 text-xs leading-6">
        این اطلاعات برای شخصی‌سازی تجربه شماست. در آینده روی تاریخ تولد شما تخفیف تولد فعال می‌شود.
      </p>

      <div className="glass-card mb-3.5 overflow-hidden rounded-[30px] p-4">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid size-10 place-items-center rounded-full bg-peach text-warn-ink">
            <Gift className="size-4" />
          </span>
          <div className="flex-1">
            <p className="text-sm font-bold text-primary">پیش‌نمایش تخفیف تولد</p>
            <p className="text-[11px] text-primary/70">وقتی اکانت پولی شد، خودکار اعمال می‌شود</p>
          </div>
        </div>

        <div className="flex items-end justify-between rounded-3xl bg-gradient-to-br from-[#EEF7F0] to-card p-3.5">
          <div>
            <p className="text-[11px] text-muted-foreground">تخفیف فعلی شما</p>
            <p className="text-3xl font-extrabold text-primary fa-num leading-tight">
              {toFa(discount.percent)}
              <span className="text-lg">٪</span>
            </p>
            <p className="mt-0.5 text-[11px] text-primary/70">سطح: {discount.tier}</p>
          </div>
          <div className="text-left">
            <Cake className="mb-1 ml-auto size-5 text-primary/70" />
            {discount.daysUntil === null ? (
              <p className="text-[11px] text-muted-foreground">تاریخ تولد را وارد کنید</p>
            ) : discount.daysUntil === 0 ? (
              <p className="text-xs font-bold text-primary">امروز تولدتونه!</p>
            ) : (
              <p className="text-[11px] text-primary/80">
                <span className="fa-num font-bold text-primary">{toFa(discount.daysUntil)}</span>{" "}
                روز تا تولد
              </p>
            )}
          </div>
        </div>

        <ul className="mt-3 space-y-1 text-[11px] text-primary/80">
          <li>
            روز تولد: <span className="fa-num font-bold">۴۰٪</span>
          </li>
          <li>
            هفته تولد (۷ روز): <span className="fa-num font-bold">۲۵٪</span>
          </li>
          <li>
            ماه تولد (۳۰ روز): <span className="fa-num font-bold">۱۵٪</span>
          </li>
          <li>
            بقیه سال: <span className="fa-num font-bold">۱۰٪</span> پایه وفاداری
          </li>
        </ul>
      </div>

      <form onSubmit={onSubmit} className="glass-card mb-3.5 space-y-3.5 rounded-[30px] p-4">
        <Field label="به چه اسمی صدات کنیم؟">
          <input
            value={callName}
            onChange={(e) => setCallName(e.target.value)}
            placeholder="مثلاً زهرا"
            className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            maxLength={40}
          />
        </Field>

        <Field label="نام">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً زهرا"
            className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            maxLength={80}
          />
        </Field>

        <Field label="نام خانوادگی">
          <input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="مثلاً کریمی"
            className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            maxLength={80}
          />
        </Field>

        <Field label="تاریخ تولد">
          <input
            type="date"
            value={birthDate ?? ""}
            onChange={(e) => setBirthDate(e.target.value)}
            dir="ltr"
            className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
          />
          <p className="mt-1 text-[11px] text-muted-foreground">
            برای تخفیف تولد در نسخه پولی استفاده می‌شود.
          </p>
        </Field>

        <Field label="شماره تلفن">
          <input
            type="tel"
            value={phone ?? ""}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="۰۹۱۲xxxxxxx"
            dir="ltr"
            className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
            maxLength={20}
          />
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary py-[15px] text-[15px] font-semibold text-primary-foreground shadow-soft transition hover:bg-brand-900 disabled:opacity-60"
        >
          <Save className="size-4" />
          {saving ? "در حال ذخیره..." : "ذخیره اطلاعات"}
        </button>
      </form>

      <PasswordCard />
    </div>
  );
}

/** Lets a signed-in user change their password. */
function PasswordCard() {
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 6) return toast.error("رمز عبور باید حداقل ۶ کاراکتر باشه");
    if (pw !== pw2) return toast.error("دو رمز با هم یکی نیستن");
    setSaving(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) throw error;
      setPw("");
      setPw2("");
      toast.success("رمز عبور ذخیره شد");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      toast.error(
        /different from the old/i.test(msg)
          ? "رمز جدید باید با رمز قبلی فرق داشته باشه"
          : /reauthentication|recent/i.test(msg)
            ? "برای تغییر رمز یک بار خارج و دوباره وارد شو"
            : msg || "خطا در ذخیرهٔ رمز",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={save} className="glass-card mb-6 space-y-3.5 rounded-[30px] p-4">
      <h2 className="flex items-center gap-2 text-base font-bold">
        <span className="grid size-9 place-items-center rounded-full bg-lilac">
          <KeyRound className="size-4" />
        </span>
        تغییر رمز عبور
      </h2>
      <p className="text-xs leading-6 text-muted-foreground">
        رمز فعلی‌ات رو اینجا عوض کن. رمز جدید از دفعهٔ بعد برای ورود لازمه.
      </p>
      <Field label="رمز جدید">
        <input
          type="password"
          autoComplete="new-password"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          placeholder="حداقل ۶ کاراکتر"
          className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      </Field>
      <Field label="تکرار رمز جدید">
        <input
          type="password"
          autoComplete="new-password"
          value={pw2}
          onChange={(e) => setPw2(e.target.value)}
          className="w-full rounded-2xl border border-input bg-white px-4 py-3 text-sm outline-none placeholder:text-muted-foreground focus:border-primary"
        />
      </Field>
      <button
        type="submit"
        disabled={saving || !pw}
        className="w-full rounded-full bg-night py-3.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "در حال ذخیره..." : "ذخیرهٔ رمز"}
      </button>
    </form>
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
