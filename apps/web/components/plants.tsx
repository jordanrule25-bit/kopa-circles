// Plant motifs used across the app. Decorative SVGs are aria-hidden; the ones
// that carry meaning (growth stage, member leaves) have a title.
import type { ReactNode } from "react";

type IconProps = { size?: number; className?: string; title?: string };

function Svg({ size = 20, className, title, children, viewBox = "0 0 24 24" }: IconProps & { children: ReactNode; viewBox?: string }) {
  return (
    <svg width={size} height={size} viewBox={viewBox} className={className} role={title ? "img" : undefined} aria-hidden={title ? undefined : true}>
      {title && <title>{title}</title>}
      {children}
    </svg>
  );
}

export function Leaf({ color = "var(--accent)", vein = "var(--surface)", ...p }: IconProps & { color?: string; vein?: string }) {
  return (
    <Svg {...p}>
      <path d="M4 20C4 10.5 10.5 4 20 4c0 9.5-6.5 16-16 16z" fill={color} />
      <path d="M4.5 19.5L15 9" stroke={vein} strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </Svg>
  );
}


const stem = "var(--accent)";
const leafFill = "var(--accent)";
const leafLight = "var(--sun)";

export function Seed(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 20h18" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <ellipse cx="12" cy="15.5" rx="4" ry="3" fill="var(--warn)" opacity="0.85" />
      <path d="M11 14.5c.8-.6 1.6-.6 2.2.2" stroke="var(--surface)" strokeWidth="1.1" fill="none" strokeLinecap="round" />
    </Svg>
  );
}

export function Sprout(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 21h18" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 21v-8" stroke={stem} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 14c-4 0-6-2.5-6-6 4 0 6 2.5 6 6z" fill={leafLight} />
      <path d="M12 13c0-3.5 2-6 6-6 0 3.5-2 6-6 6z" fill={leafFill} />
    </Svg>
  );
}

export function Plant(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 22h18" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 22V5" stroke={stem} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 17c-4 0-6.5-2-6.5-5.5 4 0 6.5 2 6.5 5.5z" fill={leafFill} />
      <path d="M12 13c4 0 6.5-2 6.5-5.5-4 0-6.5 2-6.5 5.5z" fill={leafFill} />
      <path d="M12 9c-3 0-4.5-1.5-4.5-4 3 0 4.5 1.5 4.5 4z" fill={leafLight} />
    </Svg>
  );
}

export function Bloom(p: IconProps) {
  return (
    <Svg {...p}>
      <path d="M3 22h18" stroke="var(--line)" strokeWidth="2" strokeLinecap="round" />
      <path d="M12 22V9" stroke={stem} strokeWidth="2" strokeLinecap="round" />
      <path d="M12 18c-4 0-6.5-2-6.5-5.5 4 0 6.5 2 6.5 5.5z" fill={leafFill} />
      <path d="M12 15.5c4 0 6.5-2 6.5-5.5-4 0-6.5 2-6.5 5.5z" fill={leafFill} />
      {[0, 72, 144, 216, 288].map((a) => (
        <ellipse key={a} cx="12" cy="3.6" rx="1.7" ry="2.4" fill="var(--sun-soft)" stroke="var(--sun)" strokeWidth="0.8" transform={`rotate(${a} 12 6.2)`} />
      ))}
      <circle cx="12" cy="6.2" r="1.6" fill="var(--warn)" />
    </Svg>
  );
}

const STAGES: Record<string, { Icon: (p: IconProps) => ReactNode; name: string }> = {
  FORMING: { Icon: Seed, name: "Seed: forming" },
  SUBMITTED: { Icon: Seed, name: "Seed: waiting for approval" },
  PAUSED: { Icon: Seed, name: "Resting" },
  RAISING: { Icon: Sprout, name: "Sprout: raising from lenders" },
  REPAYING: { Icon: Plant, name: "Growing: repaying" },
  COMPLETE: { Icon: Bloom, name: "In bloom: repaid" },
};

/** Seed → sprout → plant → bloom, following a circle's life. */
export function GrowthStage({ status, size = 26 }: { status: string; size?: number }) {
  const s = STAGES[status] ?? STAGES.FORMING!;
  return <s.Icon size={size} title={s.name} />;
}

/** One leaf per member: green when on time, a drooping red leaf when behind, an outline while waiting. */
export function MemberLeaves({ states }: { states: Array<"ok" | "late" | "pending"> }) {
  const label = `${states.filter((s) => s === "ok").length} on time, ${states.filter((s) => s === "late").length} behind, ${states.filter((s) => s === "pending").length} waiting`;
  return (
    <span className="flex gap-0.5" role="img" aria-label={`Members: ${label}`}>
      {states.map((s, i) =>
        s === "pending" ? (
          <svg key={i} width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M4 20C4 10.5 10.5 4 20 4c0 9.5-6.5 16-16 16z" fill="none" stroke="var(--line)" strokeWidth="2" />
          </svg>
        ) : (
          <span key={i} className={s === "late" ? "inline-block rotate-[100deg]" : "inline-block"}>
            <Leaf size={16} color={s === "late" ? "var(--bad)" : "var(--accent)"} />
          </span>
        ),
      )}
    </span>
  );
}


/** Seedling in a pot, for empty states. */
export function Seedling({ size = 72 }: { size?: number }) {
  return (
    <Svg size={size} viewBox="0 0 64 64">
      <path d="M32 40V22" stroke="var(--accent)" strokeWidth="3" strokeLinecap="round" />
      <path d="M32 28c-8 0-12-5-12-12 8 0 12 5 12 12z" fill="var(--sun)" />
      <path d="M32 25c0-8 5-13 13-13 0 8-5 13-13 13z" fill="var(--accent)" />
      <path d="M18 40h28l-3.5 18h-21z" fill="var(--warn)" opacity="0.8" />
      <rect x="16" y="37" width="32" height="6" rx="2" fill="var(--warn)" />
    </Svg>
  );
}


