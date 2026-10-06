// Flat 2D illustrations used instead of emoji (emoji render 3D on iOS).

const POT = "#F4B98D";
const POT_RIM = "#EFA877";
const LEAF_A = "#8FD3A1";
const LEAF_B = "#6DBE86";
const LEAF_C = "#5AAE76";

function Pot() {
  return (
    <>
      <path d="M19 41 H45 L41.5 58 Q41 60 39 60 H25 Q23 60 22.5 58 Z" fill={POT} />
      <rect x="16" y="36" width="32" height="7" rx="3.5" fill={POT_RIM} />
    </>
  );
}

function Houseplant() {
  return (
    <>
      <path d="M31 37 C 22 34, 13 26, 12 17 C 21 18, 28 25, 31 37 Z" fill={LEAF_A} />
      <path d="M33 37 C 42 34, 51 26, 52 17 C 43 18, 36 25, 33 37 Z" fill={LEAF_C} />
      <path d="M32 38 C 25 27, 27 13, 32 6 C 37 13, 39 27, 32 38 Z" fill={LEAF_B} />
      <Pot />
    </>
  );
}

function Cactus() {
  return (
    <>
      <rect x="17" y="17" width="7" height="14" rx="3.5" fill={LEAF_A} />
      <rect x="19" y="26" width="10" height="6" rx="3" fill={LEAF_A} />
      <rect x="40" y="13" width="7" height="14" rx="3.5" fill={LEAF_C} />
      <rect x="35" y="22" width="10" height="6" rx="3" fill={LEAF_C} />
      <rect x="25" y="9" width="14" height="30" rx="7" fill={LEAF_B} />
      <path
        d="M30 16 v3 M34 22 v3 M30 28 v3"
        stroke="#E4F3E7"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <Pot />
    </>
  );
}

function Flower() {
  const petals = [0, 60, 120, 180, 240, 300];
  return (
    <>
      <path d="M32 58 V30" stroke={LEAF_B} strokeWidth="3" strokeLinecap="round" />
      <path d="M32 48 C 24 47, 19 41, 18 35 C 25 35, 30 40, 32 48 Z" fill={LEAF_A} />
      <path d="M32 44 C 40 43, 45 37, 46 31 C 39 31, 34 36, 32 44 Z" fill={LEAF_C} />
      {petals.map((a) => (
        <circle
          key={a}
          cx={32 + Math.cos((a * Math.PI) / 180) * 8.5}
          cy={21 + Math.sin((a * Math.PI) / 180) * 8.5}
          r="6"
          fill="#F9D56E"
        />
      ))}
      <circle cx="32" cy="21" r="5.5" fill="#F2A65A" />
      <rect x="14" y="55" width="36" height="6" rx="3" fill="#BFE5C8" />
    </>
  );
}

function Lotus() {
  return (
    <>
      <ellipse cx="32" cy="52" rx="25" ry="7" fill="#CBE8F4" />
      <ellipse cx="18" cy="50" rx="10" ry="3.6" fill={LEAF_A} />
      <ellipse cx="47" cy="51" rx="8" ry="3" fill={LEAF_B} />
      <path d="M32 48 C 22 44, 18 34, 20 26 C 27 30, 31 38, 32 48 Z" fill="#F6B8C9" />
      <path d="M32 48 C 42 44, 46 34, 44 26 C 37 30, 33 38, 32 48 Z" fill="#F6B8C9" />
      <path d="M32 48 C 26 40, 26 26, 32 17 C 38 26, 38 40, 32 48 Z" fill="#F09BB3" />
    </>
  );
}

export function PlantIcon({
  type,
  className = "size-7",
}: {
  type?: string | null;
  className?: string;
}) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      {type === "cactus" ? (
        <Cactus />
      ) : type === "garden" ? (
        <Flower />
      ) : type === "aquatic" ? (
        <Lotus />
      ) : (
        <Houseplant />
      )}
    </svg>
  );
}

/** Larger potted plant for hero panels, with a soft round backdrop. */
export function HeroPlant({ className = "size-36" }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={className} aria-hidden="true">
      <circle cx="60" cy="62" r="50" fill="#FFFFFF" opacity="0.55" />
      <g transform="translate(16 14) scale(1.4)">
        <Houseplant />
      </g>
      <ellipse cx="60" cy="104" rx="26" ry="4" fill="#23573A" opacity="0.06" />
    </svg>
  );
}
