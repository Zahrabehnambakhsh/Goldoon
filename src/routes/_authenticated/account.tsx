import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowRight, Save } from "lucide-react";
import { getProfile, updateProfile } from "@/lib/plants.functions";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/account")({
  head: () => ({
    meta: [
      { title: "اطلاعات حساب • مراقبت آینده گیاه" },
      { name: "description", content: "نام، تاریخ تولد و شماره تماس خود را ویرایش کنید." },
    ],
  }),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData({ queryKey: ["profile"], queryFn: () => getProfile() });
  },
  component: AccountPage,
});

function AccountPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const { data: profile } = useSuspenseQuery({ queryKey: ["profile"], queryFn: () => getProfile() });

  const p = profile as {
    name?: string;
    family_name?: string | null;
    birth_date?: string | null;
    phone?: string | null;
  } | null;

  const [name, setName] = useState(p?.name ?? "");
  const [familyName, setFamilyName] = useState(p?.family_name ?? "");
  const [birthDate, setBirthDate] = useState(p?.birth_date ?? "");
  const [phone, setPhone] = useState(p?.phone ?? "");
  const [saving, setSaving] = useState(false);

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
    <div className="px-5 pt-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-lg font-bold text-primary">اطلاعات حساب</h1>
        <button
          onClick={() => navigate({ to: "/profile" })}
          className="grid size-9 place-items-center rounded-full bg-card text-primary shadow-soft"
          aria-label="بازگشت"
        >
          <ArrowRight className="size-4" />
        </button>
      </div>

      <p className="mb-5 rounded-2xl bg-brand-100 p-3 text-xs leading-6 text-primary/80">
        این اطلاعات برای شخصی‌سازی تجربه شماست. در آینده روی تاریخ تولد شما تخفیف تولد فعال می‌شود 🎁
      </p>

      <form onSubmit={onSubmit} className="space-y-4">
        <Field label="نام">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً زهرا"
            className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
            maxLength={80}
          />
        </Field>

        <Field label="نام خانوادگی">
          <input
            value={familyName}
            onChange={(e) => setFamilyName(e.target.value)}
            placeholder="مثلاً کریمی"
            className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
            maxLength={80}
          />
        </Field>

        <Field label="تاریخ تولد">
          <input
            type="date"
            value={birthDate ?? ""}
            onChange={(e) => setBirthDate(e.target.value)}
            dir="ltr"
            className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
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
            className="w-full rounded-xl border border-border bg-card p-3 text-sm outline-none focus:border-primary"
            maxLength={20}
          />
        </Field>

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-primary p-3.5 text-sm font-semibold text-primary-foreground shadow-soft disabled:opacity-60"
        >
          <Save className="size-4" />
          {saving ? "در حال ذخیره..." : "ذخیره اطلاعات"}
        </button>
      </form>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-primary">{label}</span>
      {children}
    </label>
  );
}
