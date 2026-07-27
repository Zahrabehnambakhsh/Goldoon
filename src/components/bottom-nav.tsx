import { Link, useMatchRoute } from "@tanstack/react-router";
import { Home, Camera, Clock, User } from "lucide-react";

const tabs = [
  { to: "/home", label: "باغچه", Icon: Home },
  { to: "/diagnose", label: "تشخیص", Icon: Camera },
  { to: "/reminders", label: "یادآور", Icon: Clock },
  { to: "/profile", label: "پروفایل", Icon: User },
] as const;

export function BottomNav() {
  const matchRoute = useMatchRoute();
  return (
    <nav className="fixed inset-x-0 bottom-4 z-40 mx-auto w-[calc(100%-2rem)] max-w-[358px]">
      <ul className="glass-nav flex items-center justify-between rounded-full p-1.5 shadow-soft">
        {tabs.map(({ to, label, Icon }) => {
          const active = matchRoute({ to, fuzzy: false });
          return (
            <li key={to} className="flex-1">
              <Link
                to={to}
                className={`flex flex-col items-center justify-center gap-0.5 rounded-full py-2 text-[11px] font-medium transition ${
                  active
                    ? "bg-white text-primary shadow-soft"
                    : "text-white/70 hover:text-white"
                }`}
              >
                <Icon className="size-5" />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
