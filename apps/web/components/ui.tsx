import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("flex min-w-0 flex-col gap-3 rounded-card border border-line bg-surface p-4", className)} {...props} />;
}

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("grid min-w-0 content-start gap-3.5 rounded-card border border-line bg-surface p-4 sm:p-[18px]", className)} {...props} />;
}

export type Tone = "neutral" | "good" | "sun" | "bad";
const chipTone: Record<Tone, string> = {
  neutral: "bg-surface-2",
  good: "bg-accent-soft",
  sun: "bg-sun-soft",
  bad: "bg-bad-soft",
};
export function Chip({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return <span className={cx("inline-block rounded-full border border-line px-2 py-0.5 text-xs font-semibold", chipTone[tone], className)} {...props} />;
}

export function Score({ score }: { score: string }) {
  return (
    <span className="num rounded-md border border-line px-[7px] py-0.5 text-sm font-medium" title="Circle score">
      {score}
    </span>
  );
}

export function Progress({ value, tone = "good", label }: { value: number; tone?: "good" | "sun"; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-2 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx("progress-fill h-full rounded-full", tone === "sun" ? "bg-sun" : "bg-accent")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub, testId }: { label: string; value: ReactNode; sub?: ReactNode; testId?: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-3.5">
      <div className="label">{label}</div>
      <div className="num mt-1 text-[1.4rem] font-medium" data-testid={testId}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted">{sub}</div>}
    </div>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-3 sm:grid-cols-[repeat(auto-fit,minmax(170px,1fr))]">{children}</div>;
}

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "default" | "danger"; size?: "sm" | "md" };
const btnBase = "inline-flex items-center justify-center rounded-lg border font-semibold disabled:opacity-45";
const btnVariant = {
  primary: "border-accent bg-accent text-accent-ink hover:brightness-95",
  default: "border-line bg-surface hover:border-accent",
  danger: "border-line bg-surface text-bad hover:border-bad",
};
const btnSize = { sm: "px-2.5 py-1 text-sm", md: "px-3 py-[7px]" };
export function Button({ variant = "default", size = "md", className, ...props }: ButtonProps) {
  return <button className={cx(btnBase, btnVariant[variant], btnSize[size], className)} {...props} />;
}
export function ButtonLink({ variant = "default", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: keyof typeof btnVariant; size?: keyof typeof btnSize }) {
  return <Link className={cx(btnBase, btnVariant[variant], btnSize[size], className)} {...props} />;
}

export function Alert({ tone = "bad", children }: { tone?: "bad" | "good"; children: ReactNode }) {
  return (
    <p role={tone === "bad" ? "alert" : "status"} className={cx("rounded-lg px-3 py-2 text-sm", tone === "bad" ? "bg-bad-soft" : "bg-accent-soft")}>
      {children}
    </p>
  );
}

export function PageHead({ title, sub, kicker, action }: { title: ReactNode; sub?: ReactNode; kicker?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        {kicker}
        <h1 className="text-2xl font-semibold">{title}</h1>
        {sub && <p className="text-sm text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Back({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-1 inline-block text-sm text-muted hover:underline">
      ← {children}
    </Link>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Panel>
      <h3 className="text-lg font-semibold">{title}</h3>
      {children && <p className="text-muted">{children}</p>}
    </Panel>
  );
}

export function Dots({ states }: { states: Array<"ok" | "late" | "pending"> }) {
  const tone = { ok: "bg-accent opacity-85", late: "bg-bad", pending: "bg-line" };
  return (
    <span className="flex gap-1" aria-label="Member status">
      {states.map((s, i) => (
        <span key={i} className={cx("h-3 w-3 rounded-full", tone[s])} />
      ))}
    </span>
  );
}
