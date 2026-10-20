import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { MemberLeaves, Seedling } from "./plants";

const cx = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(" ");

const surface = "rounded-card bg-surface shadow-card";

export function Card({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("flex min-w-0 flex-col gap-4 p-6", surface, className)} {...props} />;
}

export function Panel({ className, ...props }: ComponentProps<"section">) {
  return <section className={cx("grid min-w-0 content-start gap-4 p-5 sm:p-7", surface, className)} {...props} />;
}

export type Tone = "neutral" | "good" | "sun" | "bad";
const chipTone: Record<Tone, string> = {
  neutral: "bg-surface-2 text-muted",
  good: "bg-accent-soft text-accent",
  sun: "bg-sun-soft text-accent",
  bad: "bg-bad-soft text-bad",
};
export function Chip({ tone = "neutral", className, ...props }: ComponentProps<"span"> & { tone?: Tone }) {
  return <span className={cx("inline-block rounded-full px-2.5 py-0.5 text-xs font-medium", chipTone[tone], className)} {...props} />;
}

export function Score({ score }: { score: string }) {
  return (
    <span className="num inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-2 text-sm font-semibold" title={`Circle score ${score}`}>
      {score}
    </span>
  );
}

export function Progress({ value, tone = "good", label }: { value: number; tone?: "good" | "sun"; label?: string }) {
  const pct = Math.max(0, Math.min(1, value)) * 100;
  return (
    <div className="h-1.5 overflow-hidden rounded-full bg-surface-2" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
      <div className={cx("progress-fill h-full rounded-full", tone === "sun" ? "bg-sun" : "bg-accent")} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Stat({ label, value, sub, testId }: { label: string; value: ReactNode; sub?: ReactNode; testId?: string }) {
  return (
    <div className={cx("p-5", surface)}>
      <div className="label">{label}</div>
      <div className="num mt-1 text-[1.75rem] font-semibold tracking-tight" data-testid={testId}>
        {value}
      </div>
      {sub && <div className="mt-0.5 text-sm text-muted">{sub}</div>}
    </div>
  );
}

export function Stats({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-4 sm:grid-cols-[repeat(auto-fit,minmax(190px,1fr))]">{children}</div>;
}

type ButtonProps = ComponentProps<"button"> & { variant?: "primary" | "default" | "danger"; size?: "sm" | "md" };
const btnBase = "inline-flex items-center justify-center rounded-full font-medium transition-colors disabled:opacity-40";
const btnVariant = {
  primary: "bg-accent text-accent-ink hover:brightness-110",
  default: "bg-surface-2 text-fg hover:bg-line",
  danger: "bg-bad-soft text-bad hover:brightness-95",
};
const btnSize = { sm: "px-4 py-1.5 text-sm", md: "px-5 py-2.5" };
export function Button({ variant = "default", size = "md", className, ...props }: ButtonProps) {
  return <button className={cx(btnBase, btnVariant[variant], btnSize[size], className)} {...props} />;
}
export function ButtonLink({ variant = "default", size = "md", className, ...props }: ComponentProps<typeof Link> & { variant?: keyof typeof btnVariant; size?: keyof typeof btnSize }) {
  return <Link className={cx(btnBase, btnVariant[variant], btnSize[size], className)} {...props} />;
}

export function Alert({ tone = "bad", children }: { tone?: "bad" | "good"; children: ReactNode }) {
  return (
    <p role={tone === "bad" ? "alert" : "status"} className={cx("rounded-xl px-4 py-2.5 text-sm", tone === "bad" ? "bg-bad-soft text-bad" : "bg-accent-soft text-accent")}>
      {children}
    </p>
  );
}

export function PageHead({ title, sub, kicker, action }: { title: ReactNode; sub?: ReactNode; kicker?: ReactNode; action?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        {kicker}
        <h1 className="text-3xl font-semibold sm:text-4xl">{title}</h1>
        {sub && <p className="mt-1 text-muted">{sub}</p>}
      </div>
      {action}
    </div>
  );
}

export function Back({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="mb-2 inline-block text-sm text-accent hover:underline">
      ‹ {children}
    </Link>
  );
}

export function Note({ children }: { children: ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}

export function Empty({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <Panel className="justify-items-center py-12 text-center">
      <Seedling size={56} />
      <h3 className="text-xl font-semibold">{title}</h3>
      {children && <p className="max-w-md text-muted">{children}</p>}
    </Panel>
  );
}

export function Dots({ states }: { states: Array<"ok" | "late" | "pending"> }) {
  return <MemberLeaves states={states} />;
}
