// Ledger-style components for the Public Ledger / Field Dispatch direction.
// Rule-based layout, numbered sections, tabular figures. No pill chips, no
// rounded cards, minimal shadow — the structure IS the decoration.

import Link from "next/link";
import type { ReactNode } from "react";

/** Top-of-page dateline. Edition number, place, date — like a newspaper flag. */
export function Dateline({ edition, place, date }: { edition: string; place: string; date: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-y border-fg py-1.5 font-mono text-[0.7rem] uppercase tracking-[0.18em] sm:text-xs">
      <span>Edition {edition}</span>
      <span className="opacity-60" aria-hidden="true">·</span>
      <span>{place}</span>
      <span className="opacity-60" aria-hidden="true">·</span>
      <span>{date}</span>
      <span className="ml-auto opacity-60">All figures from the ledger · Pilot: sample data</span>
    </div>
  );
}

/** A live-ish running ticker below the dateline. Updated per-request. */
export function LedgerTicker({ items }: { items: Array<{ label: string; value: string }> }) {
  return (
    <div className="border-b border-line">
      <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1 py-2 text-sm">
        <span className="kicker shrink-0 text-fg">Today's ledger —</span>
        {items.map((it, i) => (
          <span key={i} className="flex items-baseline gap-1.5 text-muted">
            <span>{it.label}</span>
            <span className="num font-medium text-fg">{it.value}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

/** Numbered section header: "No. 01 — Loans in motion" with a rule beneath. */
export function SectionNo({
  no,
  title,
  sub,
  rightSlot,
}: {
  no: string;
  title: string;
  sub?: ReactNode;
  rightSlot?: ReactNode;
}) {
  return (
    <header className="grid gap-3 border-b border-fg pb-5">
      <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
        <div className="flex items-baseline gap-5">
          <span className="font-display text-4xl text-muted sm:text-5xl" style={{ fontVariationSettings: '"SOFT" 100, "opsz" 48' }}>
            No. {no}
          </span>
          <h2 className="font-display text-3xl sm:text-4xl">{title}</h2>
        </div>
        {rightSlot}
      </div>
      {sub && <p className="max-w-3xl text-muted">{sub}</p>}
    </header>
  );
}

/** A ruled row for a "Public Record" table: small count | label+sub | big value. */
export function LedgerRow({
  no,
  label,
  value,
  sub,
  tone = "fg",
}: {
  no: string;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  tone?: "fg" | "clay" | "accent";
}) {
  const toneClass = tone === "clay" ? "text-clay" : tone === "accent" ? "text-accent" : "text-fg";
  return (
    <div className="grid grid-cols-[48px_1fr_auto] items-baseline gap-4 border-b border-line py-5 last:border-b-0 sm:gap-8">
      <span className="num font-mono text-xs text-muted sm:text-sm">{no}</span>
      <div className="min-w-0">
        <div className="font-medium">{label}</div>
        {sub && <div className="mt-0.5 text-sm text-muted">{sub}</div>}
      </div>
      <div className={`num font-display text-3xl sm:text-4xl ${toneClass}`} style={{ fontVariationSettings: '"SOFT" 70, "opsz" 48' }}>
        {value}
      </div>
    </div>
  );
}

/** A numbered editorial item for a numbered list (How it works, safety net). */
export function DispatchItem({ no, title, children }: { no: string; title: string; children: ReactNode }) {
  return (
    <article className="grid grid-cols-[52px_1fr] gap-x-5 gap-y-1 border-b border-line py-6 last:border-b-0 sm:grid-cols-[72px_1fr] sm:gap-x-8 sm:py-8">
      <span className="font-display text-4xl text-muted sm:text-5xl" style={{ fontVariationSettings: '"SOFT" 100, "opsz" 48' }}>
        {no}
      </span>
      <div className="grid gap-2">
        <h3 className="font-display text-2xl sm:text-3xl">{title}</h3>
        <p className="text-muted">{children}</p>
      </div>
    </article>
  );
}

/** A small rectangular button. No rounded-full. Reads like a clipping. */
export function LedgerButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: ReactNode;
  variant?: "primary" | "ghost";
}) {
  const base = "inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "border border-fg bg-fg text-bg hover:bg-transparent hover:text-fg"
      : "border border-line text-fg hover:border-fg";
  return (
    <Link href={href} className={`${base} ${styles}`} style={{ borderRadius: 2 }}>
      {children}
    </Link>
  );
}

/** A simple underlined text link — the most common editorial action. */
export function LedgerLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} className="font-medium text-accent underline underline-offset-4 hover:text-fg">
      {children}
    </Link>
  );
}

/** A Q&A pair as running copy — replaces the FAQ accordion. */
export function Qa({ q, a }: { q: string; a: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-line py-6 last:border-b-0">
      <h3 className="kicker not-italic font-display text-lg text-fg sm:text-xl" style={{ fontStyle: "normal", fontVariationSettings: '"SOFT" 100, "opsz" 36' }}>
        {q}
      </h3>
      <p className="text-muted">{a}</p>
    </div>
  );
}
