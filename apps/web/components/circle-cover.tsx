// A circle's cover: its members' initials sitting in a ring. Gives every
// circle a recognisable face without photos (those need consent and uploads).

const TINTS = ["#e6f4e9", "#eef7ea", "#e8f3ef", "#f1f6e4", "#e4f1ec"];
const INKS = ["#1f8a3c", "#4b8f2a", "#1d7a63", "#6b7f1a", "#20745a"];

function hash(s: string) {
  let h = 0;
  for (const ch of s) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h;
}

const initials = (name: string) =>
  name
    .replace(/\./g, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");

export function CircleCover({ id, names, size = "md" }: { id: string; names: string[]; size?: "sm" | "md" | "lg" }) {
  const h = hash(id);
  const tint = TINTS[h % TINTS.length]!;
  const ink = INKS[h % INKS.length]!;
  const height = size === "lg" ? 180 : size === "md" ? 120 : 84;
  const r = size === "lg" ? 26 : size === "md" ? 20 : 15;
  const ring = size === "lg" ? 52 : size === "md" ? 38 : 26;
  const people = names.slice(0, 5);
  const label = `Members: ${names.map((n) => n.split(" ")[0]).join(", ")}`;

  return (
    <div className="relative overflow-hidden rounded-[14px]" style={{ height, background: `linear-gradient(135deg, ${tint}, var(--surface))` }} role="img" aria-label={label}>
      <svg viewBox={`-100 -${height / 2} 200 ${height}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
        <circle r={ring} fill="none" stroke={ink} strokeOpacity="0.18" strokeWidth="1.5" strokeDasharray="2 4" />
        {people.map((n, i) => {
          const a = (-90 + (360 / people.length) * i) * (Math.PI / 180);
          const x = Math.cos(a) * ring;
          const y = Math.sin(a) * ring;
          return (
            <g key={i} transform={`translate(${x} ${y})`}>
              <circle r={r * 0.62} fill="var(--surface)" stroke={ink} strokeOpacity="0.35" />
              <text textAnchor="middle" dominantBaseline="central" fontSize={r * 0.5} fontWeight="600" fill={ink} fontFamily="var(--font-body)">
                {initials(n)}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
