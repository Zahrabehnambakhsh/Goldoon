// Decorative leaves and wildflowers drawn behind hero panels.

function Leaf({
  x,
  y,
  w,
  rot,
  fill,
  op,
}: {
  x: number;
  y: number;
  w: number;
  rot: number;
  fill: string;
  op: number;
}) {
  const h = w * 0.42;
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot})`} opacity={op}>
      <path
        d={`M0 0 C ${w * 0.25} ${-h}, ${w * 0.75} ${-h}, ${w} 0 C ${w * 0.75} ${h}, ${w * 0.25} ${h}, 0 0 Z`}
        fill={fill}
      />
      <path
        d={`M0 0 L ${w * 0.92} 0`}
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.5"
        fill="none"
      />
    </g>
  );
}

function Flower({ x, y, r, color }: { x: number; y: number; r: number; color: string }) {
  return (
    <g>
      {[0, 1, 2, 3, 4].map((k) => {
        const a = (k * 72 * Math.PI) / 180;
        return (
          <circle
            key={k}
            cx={x + Math.cos(a) * r}
            cy={y + Math.sin(a) * r}
            r={r * 0.8}
            fill={color}
          />
        );
      })}
      <circle cx={x} cy={y} r={r * 0.55} fill="#F2C14E" />
    </g>
  );
}

export function Foliage() {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden="true">
      <svg
        viewBox="0 0 160 330"
        width="160"
        height="330"
        className="absolute -right-10 top-[150px]"
      >
        <Leaf x={150} y={40} w={140} rot={150} fill="#2E5A3B" op={0.95} />
        <Leaf x={160} y={110} w={150} rot={165} fill="#3F7148" op={0.9} />
        <Leaf x={150} y={190} w={130} rot={195} fill="#2E5A3B" op={0.85} />
        <Leaf x={160} y={250} w={120} rot={210} fill="#5B8A55" op={0.8} />
        <Flower x={40} y={270} r={6} color="#A99AE0" />
        <Flower x={70} y={300} r={5} color="#ffffff" />
      </svg>
      <svg viewBox="0 0 150 260" width="150" height="260" className="absolute -left-10 top-[150px]">
        <Leaf x={0} y={40} w={130} rot={20} fill="#3F7148" op={0.9} />
        <Leaf x={0} y={110} w={140} rot={-10} fill="#2E5A3B" op={0.95} />
        <Leaf x={0} y={170} w={120} rot={-30} fill="#5B8A55" op={0.85} />
        <Flower x={110} y={200} r={6} color="#ffffff" />
        <Flower x={90} y={230} r={5} color="#A99AE0" />
      </svg>
    </div>
  );
}
