"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import type { LendState } from "@/app/lend-actions";
import { Alert, Button } from "./ui";

const PRESETS = [25, 50, 100];
const money = (cents: number) => `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: cents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

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
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    if (state.done) dialog.current?.showModal();
  }, [state]);

  const fromBalance = Math.min(balanceCents, amount * 100);
  const charged = amount * 100 - fromBalance + (tip ? Math.round(amount * 5) : 0);

  return (
    <>
      {remainingCents === 0 ? (
        <p className="text-sm text-muted">Fully funded. Thank you to everyone who lent.</p>
      ) : (
        <form action={formAction} className="grid gap-3" aria-label={`Lend to ${circleName}`}>
          <div className="flex flex-wrap gap-1.5">
            {options.map((a) => (
              <label
                key={a}
                className={`cursor-pointer rounded-full px-3.5 py-1 text-sm font-medium transition-colors ${amount === a ? "bg-fg text-bg" : "bg-surface-2 hover:bg-line"}`}
              >
                <input type="radio" name="amount" value={a} checked={amount === a} onChange={() => setAmount(a)} className="sr-only" />
                {Number.isInteger(a) ? `$${a}` : `$${a.toFixed(2)}`}
              </label>
            ))}
          </div>
          {!compact && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="tip" checked={tip} onChange={(e) => setTip(e.target.checked)} className="accent-[var(--accent)]" />
              Add a 5% tip to keep Kopa running
            </label>
          )}
          {compact && tip && <input type="hidden" name="tip" value="on" />}
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" disabled={pending}>
              {pending ? "Lending…" : `Lend $${amount}`}
            </Button>
            <span className="text-xs text-muted">
              {fromBalance > 0 ? `${money(fromBalance)} from balance` : ""}
              {fromBalance > 0 && charged > 0 ? " · " : ""}
              {charged > 0 ? `${money(charged)} by card (test mode)` : ""}
            </span>
          </div>
          {!compact && <p className="text-xs text-muted">0% interest. You get principal back, and you could lose some or all of it. This is not an investment.</p>}
          {state.error && <Alert>{state.error}</Alert>}
        </form>
      )}

      <dialog
        ref={dialog}
        className="m-auto w-[min(440px,calc(100%-32px))] rounded-[22px] bg-surface p-0 text-fg shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm"
        aria-labelledby="thanks-title"
      >
        {state.done && (
          <div className="grid gap-5 p-7 text-center">
            <svg width="56" height="56" viewBox="0 0 24 24" className="mx-auto" aria-hidden="true">
              <path d="M4 20C4 10.5 10.5 4 20 4c0 9.5-6.5 16-16 16z" fill="var(--accent)" />
              <path d="M4.5 19.5L15 9" stroke="var(--surface)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
            </svg>
            <div className="grid gap-1">
              <h2 id="thanks-title" className="text-2xl font-semibold">
                Thank you
              </h2>
              <p className="text-muted">
                Your {money(state.done.amountCents)} is now part of {state.done.circleName}
                {state.done.lenders > 1 ? `, alongside ${state.done.lenders - 1} other lender${state.done.lenders > 2 ? "s" : ""}` : ""}.
              </p>
            </div>
            <div className="rounded-2xl bg-surface-2 p-4 text-left text-sm">
              <p className="font-medium">{state.done.fullyFunded ? "This circle is now fully funded." : `${money(state.done.remainingCents)} still to go.`}</p>
              <p className="mt-1 text-muted">
                {state.done.fullyFunded
                  ? "The partner will send each member their loan on M-Pesa. Repayments start a week later and come back to your balance weekly."
                  : "Once it's fully funded, each member gets their loan on M-Pesa. You'll see weekly repayments in your portfolio."}
              </p>
              {state.done.tipCents > 0 && <p className="mt-2 text-muted">Thanks for the {money(state.done.tipCents)} tip.</p>}
            </div>
            <div className="grid gap-2">
              <Link href="/" className="rounded-full bg-accent px-5 py-2.5 font-medium text-accent-ink hover:brightness-110" onClick={() => dialog.current?.close()}>
                Find another circle
              </Link>
              <button type="button" onClick={() => dialog.current?.close()} className="rounded-full px-5 py-2.5 font-medium text-accent hover:bg-surface-2">
                Done
              </button>
            </div>
          </div>
        )}
      </dialog>
    </>
  );
}
