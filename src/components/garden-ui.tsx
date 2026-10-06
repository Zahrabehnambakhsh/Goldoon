import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";

export function SquareButton({
  onClick,
  label,
  children,
}: {
  onClick?: () => void;
  label: string;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="glass-card grid size-[46px] place-items-center rounded-2xl text-foreground"
    >
      {children}
    </button>
  );
}

export function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <SquareButton onClick={onClick} label="بازگشت">
      <ChevronRight className="size-5" />
    </SquareButton>
  );
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: ReadonlyArray<{ value: T; label: string }>;
  onChange?: (v: T) => void;
}) {
  return (
    <div className="glass-card inline-flex rounded-2xl p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange?.(o.value)}
          className={`rounded-xl px-4 py-2 text-[13px] font-semibold transition ${
            value === o.value ? "bg-primary text-primary-foreground" : "text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Big number with a small unit beside it, e.g. "۷ روز". */
export function BigStat({
  value,
  unit,
  label,
  className = "",
}: {
  value: string;
  unit?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <span className="text-[32px] font-bold leading-none fa-num">{value}</span>
      {unit && <span className="ms-1 text-[15px] font-medium">{unit}</span>}
      {label && <p className="mt-1 text-xs text-muted-foreground">{label}</p>}
    </div>
  );
}

export function IconBubble({
  tone,
  children,
}: {
  tone: "mint" | "peach" | "rose" | "lilac" | "cream";
  children: ReactNode;
}) {
  const bg = {
    mint: "bg-brand-100 text-primary",
    peach: "bg-peach",
    rose: "bg-rose",
    lilac: "bg-lilac",
    cream: "bg-[#F3ECDC]",
  }[tone];
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-full text-lg ${bg}`}>
      {children}
    </span>
  );
}
