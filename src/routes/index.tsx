import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import logoAsset from "@/assets/logo.png.asset.json";
import { ensureSession } from "@/lib/device-session";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "مراقبت آینده گیاه" },
      { name: "description", content: "با یک لمس وارد دنیای مراقبت هوشمند از گیاهانت شو." },
      { property: "og:title", content: "مراقبت آینده گیاه" },
      { property: "og:description", content: "با یک لمس وارد دنیای مراقبت هوشمند از گیاهانت شو." },
    ],
  }),
  component: SplashPage,
});

function SplashPage() {
  const navigate = useNavigate();
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    const start = Date.now();
    (async () => {
      try {
        await ensureSession();
        const wait = Math.max(0, 1400 - (Date.now() - start));
        setTimeout(() => {
          if (active) navigate({ to: "/home", replace: true });
        }, wait);
      } catch {
        if (active) setFailed(true);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  return (
    <div
      className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-8"
      style={{ background: "linear-gradient(160deg, #40916C 0%, #2D6A4F 45%, #1B4332 100%)" }}
    >
      <div className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-white/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -left-20 size-80 rounded-full bg-white/10 blur-3xl" />

      <div className="flex flex-col items-center gap-6 animate-in fade-in zoom-in-95 duration-700">
        <img
          src={logoAsset.url}
          alt="لوگوی مراقبت آینده گیاه"
          className="w-40 drop-shadow-[0_8px_24px_rgba(0,0,0,0.25)]"
        />
        <div className="text-center">
          <h1 className="text-2xl font-extrabold tracking-tight text-primary-foreground">
            مراقبت آینده گیاه
          </h1>
          <p className="mt-2 text-sm text-primary-foreground/75">
            گیاهانت رو هوشمند نگه‌دار
          </p>
        </div>
      </div>

      <div className="absolute bottom-12 flex flex-col items-center gap-3">
        {failed ? (
          <button
            onClick={() => location.reload()}
            className="rounded-full bg-primary-foreground px-6 py-2.5 text-sm font-semibold text-primary"
          >
            تلاش دوباره
          </button>
        ) : (
          <div className="flex gap-1.5">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className="size-2 animate-bounce rounded-full bg-primary-foreground/70"
                style={{ animationDelay: `${i * 150}ms` }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
