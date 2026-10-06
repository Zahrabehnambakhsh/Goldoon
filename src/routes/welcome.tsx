import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { HeroPlant } from "@/components/flat-art";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { ArrowLeft, Leaf } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Foliage } from "@/components/foliage";
import { getProfile, setDisplayName } from "@/lib/plants.functions";

// Shown once, right after the first login: "what should we call you?"
export const Route = createFileRoute("/welcome")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "خوش اومدی • Goldoon" },
      { name: "description", content: "اسمی که گلدون باهاش صدات می‌کنه." },
    ],
  }),
  beforeLoad: async ({ context }) => {
    const { data } = await supabase.auth.getUser();
    if (!data.user) throw redirect({ to: "/auth" });
    const profile = await context.queryClient.ensureQueryData({
      queryKey: ["profile"],
      queryFn: () => getProfile(),
    });
    return { suggested: profile?.name?.trim() ?? "" };
  },
  component: WelcomePage,
});

function WelcomePage() {
  const { suggested } = Route.useRouteContext();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const saveFn = useServerFn(setDisplayName);
  const [name, setName] = useState(suggested);
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = name.trim();
    if (!value) return toast.error("یه اسم بنویس");
    setSaving(true);
    try {
      await saveFn({ data: { display_name: value } });
      // Update the cache right away: the next route guard reads it and must not send us back here.
      qc.setQueryData(["profile"], (old: object | null | undefined) =>
        old ? { ...old, display_name: value } : old,
      );
      qc.invalidateQueries({ queryKey: ["profile"] });
      toast.success(`خوش اومدی ${value}`);
      navigate({ to: "/home", replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "خطا در ذخیره");
      setSaving(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <section className="hero-sand relative h-[38vh] min-h-[250px] max-h-[340px] overflow-hidden rounded-b-[40px] border-x-0 border-t-0">
        <Foliage />
        <div className="absolute right-5 top-5 flex items-center gap-2 rounded-full border border-white bg-white/70 py-1.5 pe-4 ps-1.5 backdrop-blur">
          <span className="grid size-8 place-items-center rounded-full bg-brand-100 text-primary">
            <Leaf className="size-4" />
          </span>
          <span className="text-sm font-extrabold">Goldoon</span>
        </div>
        <HeroPlant className="absolute left-1/2 top-[56%] size-[150px] -translate-x-1/2 -translate-y-1/2" />
      </section>

      <form
        onSubmit={save}
        className="relative z-10 -mt-8 flex-1 rounded-t-[36px] bg-card px-5 pb-10 pt-7 shadow-[0_-10px_30px_rgba(46,90,64,0.06)]"
      >
        <span
          className="mx-auto mb-5 block h-1.5 w-10 rounded-full bg-[#DCE8DE]"
          aria-hidden="true"
        />
        <h1 className="text-[26px] font-extrabold leading-tight">به چه اسمی صدات کنیم؟</h1>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
          گلدون با همین اسم بهت سلام می‌کنه. بعداً از پروفایل هم می‌تونی عوضش کنی.
        </p>

        <label className="mt-6 block">
          <span className="sr-only">اسم</span>
          <input
            autoFocus
            required
            maxLength={40}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثلاً زهرا"
            className="h-[56px] w-full rounded-2xl border border-transparent bg-[#EFF5F0] px-4 text-lg font-semibold outline-none transition placeholder:font-normal placeholder:text-[#98A69D] focus:border-primary/40 focus:bg-white focus:ring-4 focus:ring-primary/10"
          />
        </label>

        {name.trim() && (
          <p className="mt-3 rounded-2xl bg-brand-100 px-4 py-3 text-sm">
            پیش‌نمایش: <b>سلام، {name.trim()}</b>
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="mt-6 flex h-[54px] w-full items-center justify-center gap-2 rounded-full bg-primary text-[15px] font-semibold text-primary-foreground shadow-[0_10px_24px_rgba(46,90,59,0.28)] transition hover:bg-brand-900 disabled:opacity-60"
        >
          {saving ? "در حال ذخیره..." : "بزن بریم"}
          {!saving && <ArrowLeft className="size-[18px]" />}
        </button>
      </form>
    </div>
  );
}
