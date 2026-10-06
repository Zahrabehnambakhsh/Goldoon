import { Link, useMatchRoute } from "@tanstack/react-router";
import { Home, Camera, Clock, User, Plus } from "lucide-react";

const tabs = [
  { to: "/home", label: "باغچه", Icon: Home },
  { to: "/diagnose", label: "تشخیص", Icon: Camera },
  { to: "/add-plant", label: "افزودن گیاه", Icon: Plus },
  { to: "/reminders", label: "یادآور", Icon: Clock },
  { to: "/profile", label: "پروفایل", Icon: User },
] as const;

export function BottomNav() {
  const matchRoute = useMatchRoute();
  return (
    <nav
      aria-label="منوی اصلی"
      className="fixed inset-x-0 bottom-[calc(14px+env(safe-area-inset-bottom,0px))] z-40 mx-auto w-[calc(100%-2rem)] max-w-[368px]"
    >
      <ul className="glass-nav flex items-center justify-between rounded-[30px] px-2.5 py-2">
        {tabs.map(({ to, label, Icon }) => {
          const active = matchRoute({ to, fuzzy: false });
          const isAdd = to === "/add-plant";
          return (
            <li key={to}>
              <Link
                to={to}
                aria-label={label}
                title={label}
                className={`grid size-[52px] place-items-center rounded-full transition ${
                  active
                    ? "bg-white text-primary"
                    : isAdd
                      ? "bg-primary text-primary-foreground"
                      : "text-white/45 hover:text-white/85"
                }`}
              >
                <Icon className="size-[22px]" />
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
