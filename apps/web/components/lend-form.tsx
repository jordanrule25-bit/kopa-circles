"use client";

import { useActionState, useState } from "react";
import type { LendState } from "@/app/lend-actions";
import { Alert, Button, Note } from "./ui";

const PRESETS = [25, 50, 100];

export function LendForm({
  action,
  remainingCents,
  balanceCents,
  compact = false,
  circleName,
}: {
  action: (s: LendState, f: FormData) => Promise<LendState>;
  remainingCents: number;
  balanceCents: number;
  compact?: boolean;
  circleName: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const max = remainingCents / 100;
  const options = PRESETS.filter((p) => p <= max);
  if (options.length === 0 && max > 0) options.push(max);
  const [amount, setAmount] = useState(options[0] ?? 25);
  const [tip, setTip] = useState(true);
  const fromBalance = Math.min(balanceCents, amount * 100);
  const charged = amount * 100 - fromBalance + (tip ? Math.round(amount * 5) : 0);

  if (remainingCents === 0) return <Note>Fully funded. Thank you to everyone who lent.</Note>;

  return (
    <form action={formAction} className="grid gap-2" aria-label={`Lend to ${circleName}`}>
      <div className="flex flex-wrap gap-1.5">
        {options.map((a) => (
          <label key={a} className={`cursor-pointer rounded-lg border px-2.5 py-1 text-sm font-semibold ${amount === a ? "border-accent bg-accent text-accent-ink" : "border-line bg-surface hover:border-accent"}`}>
            <input type="radio" name="amount" value={a} checked={amount === a} onChange={() => setAmount(a)} className="sr-only" />
            {Number.isInteger(a) ? `$${a}` : `$${a.toFixed(2)}`}
          </label>
        ))}
      </div>
      {!compact && (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="tip" checked={tip} onChange={(e) => setTip(e.target.checked)} />
          Add a 5% tip to keep Kopa running
        </label>
      )}
      {compact && tip && <input type="hidden" name="tip" value="on" />}
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="primary" size="sm" disabled={pending}>
          {pending ? "Lending…" : `Lend $${amount}`}
        </Button>
        <span className="text-xs text-muted">
          {fromBalance > 0 ? `$${(fromBalance / 100).toFixed(2)} from balance` : ""}
          {fromBalance > 0 && charged > 0 ? " · " : ""}
          {charged > 0 ? `$${(charged / 100).toFixed(2)} by card (test mode)` : ""}
        </span>
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      {state.ok && <Alert tone="good">{state.ok}</Alert>}
    </form>
  );
}
