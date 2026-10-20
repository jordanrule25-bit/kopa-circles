"use client";

import type { LimitDecision } from "@kopa/core";
import { useActionState, useEffect, useState, useTransition } from "react";
import { ActionBar } from "@/components/agent-ui";
import { Alert, Button } from "@/components/ui";
import type { FormState } from "../../../../actions";

const usd = (c: number) => `$${(c / 100).toLocaleString("en-US")}`;
const kes = (c: number) => `KSh ${Math.round(c / 100).toLocaleString("en-US")}`;
const DECLINE: Record<string, string> = {
  TOO_MANY_ACTIVE_LOANS: "More than 2 active loans at the credit bureau",
  INFLOW_TOO_LOW: "Weekly inflow supports less than $50",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-4 rounded-card bg-surface p-5 shadow-card">
      <legend className="float-left mb-1 w-full text-lg font-semibold">{title}</legend>
      {children}
    </fieldset>
  );
}

export function MemberForm({
  action,
  preview,
  slot,
}: {
  action: (s: FormState, f: FormData) => Promise<FormState>;
  preview: (inflowKes: number, loans: number) => Promise<LimitDecision | null>;
  slot: number;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  const [inflow, setInflow] = useState("");
  const [loans, setLoans] = useState("0");
  const [decision, setDecision] = useState<LimitDecision | null>(null);
  const [, startPreview] = useTransition();

  // Ask the server for the limit shortly after the agent stops typing.
  useEffect(() => {
    const i = Number(inflow);
    const l = Number(loans);
    if (inflow === "" || !Number.isInteger(i) || !Number.isInteger(l)) {
      setDecision(null);
      return;
    }
    const t = setTimeout(() => startPreview(async () => setDecision(await preview(i, l))), 350);
    return () => clearTimeout(t);
  }, [inflow, loans, preview]);

  return (
    <form action={formAction} className="grid gap-5">
      <Section title="Who">
        <label className="field">
          <span>Name</span>
          <input name="name" required autoComplete="off" autoCapitalize="words" enterKeyHint="next" placeholder="First name and initial" />
        </label>
        <label className="field">
          <span>Business</span>
          <input name="business" required autoComplete="off" enterKeyHint="next" placeholder="e.g. Vegetable stall" />
        </label>
      </Section>

      <Section title="Contact">
        <label className="field">
          <span>Mobile number</span>
          <input name="phone" required type="tel" inputMode="tel" autoComplete="off" enterKeyHint="next" placeholder="0712 345 678" />
        </label>
        <label className="field">
          <span>National ID number</span>
          <input name="nationalId" required inputMode="numeric" autoComplete="off" enterKeyHint="next" />
        </label>
        <p className="text-sm text-muted">Stored only as one-way hashes. Never shown to lenders.</p>
      </Section>

      <Section title="Money">
        <label className="field">
          <span>Weekly inflow (KSh)</span>
          <input
            name="weeklyInflowKes"
            required
            type="number"
            inputMode="numeric"
            min={0}
            step={1}
            enterKeyHint="next"
            value={inflow}
            onChange={(e) => setInflow(e.target.value)}
          />
          <span className="hint">Average weekly money in, from their M-Pesa statement.</span>
        </label>
        <label className="field">
          <span>Active loans at the credit bureau</span>
          <input name="activeLoans" required type="number" inputMode="numeric" min={0} step={1} value={loans} onChange={(e) => setLoans(e.target.value)} />
        </label>
        <div aria-live="polite" data-testid="limit-preview">
          {decision?.status === "APPROVED" && (
            <div className="rounded-xl bg-accent-soft p-4">
              <div className="text-sm text-accent">Can borrow up to</div>
              <div className="num text-2xl font-semibold tracking-tight">
                {usd(decision.amountUsdCents)} <span className="text-base font-normal text-muted">· {kes(decision.amountKesCents)}</span>
              </div>
              <div className="text-sm text-muted">
                {kes(decision.installmentKesCents)} a week for 26 weeks · {decision.limitedBy === "CYCLE_CAP" ? "cycle cap" : "limited by inflow"}
              </div>
            </div>
          )}
          {decision?.status === "DECLINED" && (
            <div className="rounded-xl bg-bad-soft p-4 text-bad">
              <div className="font-medium">Won’t qualify</div>
              <div className="text-sm">{DECLINE[decision.reason]}. They can still join the circle without a loan.</div>
            </div>
          )}
        </div>
      </Section>

      <label className="flex items-start gap-3 rounded-card bg-surface p-5 shadow-card">
        <input name="consent" type="checkbox" required className="mt-1 h-6 w-6 flex-none accent-[var(--accent)]" />
        <span>
          <span className="block font-medium">The member agreed</span>
          <span className="text-sm text-muted">
            I explained the loan terms (flat 7% fee, 26 weekly payments) and how their data is used. Each member has their own loan; the circle does
            not guarantee it.
          </span>
        </span>
      </label>

      <ActionBar>
        {state.error && <Alert>{state.error}</Alert>}
        <Button variant="primary" disabled={pending} className="w-full py-3.5 text-[17px]">
          {pending ? "Adding…" : "Add member"}
        </Button>
        <span className="text-center text-xs text-muted sm:hidden">Member {slot} of 5</span>
      </ActionBar>
    </form>
  );
}
