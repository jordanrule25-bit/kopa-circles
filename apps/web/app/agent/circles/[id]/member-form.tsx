"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Button, Note } from "@/components/ui";
import type { FormState } from "../../actions";

export function MemberForm({ action, remaining }: { action: (s: FormState, f: FormData) => Promise<FormState>; remaining: number }) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="grid gap-4 rounded-card bg-surface shadow-card p-4">
      <h2 className="text-xl font-semibold">
        Add a member <span className="font-body font-normal text-muted">({remaining} to go)</span>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="field">
          <span>Name</span>
          <input name="name" required placeholder="First name and initial" />
        </label>
        <label className="field">
          <span>Business</span>
          <input name="business" required placeholder="e.g. Vegetable stall" />
        </label>
        <label className="field">
          <span>Mobile number</span>
          <input name="phone" required inputMode="tel" placeholder="0712 345 678" />
        </label>
        <label className="field">
          <span>National ID number</span>
          <input name="nationalId" required inputMode="numeric" />
        </label>
        <label className="field">
          <span>Weekly inflow (KSh)</span>
          <input name="weeklyInflowKes" required type="number" min={0} step={1} />
          <span className="hint">Average weekly money in, from their M-Pesa statement.</span>
        </label>
        <label className="field">
          <span>Active loans at the credit bureau</span>
          <input name="activeLoans" required type="number" min={0} step={1} defaultValue={0} />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input name="consent" type="checkbox" required className="mt-1" />
        <span>
          I explained the loan terms (flat 7% fee, 26 weekly payments) and how their data is used, and the member agreed. Each member has
          their own loan; the circle does not guarantee it.
        </span>
      </label>
      {state.error && <Alert>{state.error}</Alert>}
      <div>
        <Button variant="primary" disabled={pending}>
          {pending ? "Adding…" : "Add member"}
        </Button>
      </div>
      <Note>Phone numbers and IDs are stored only as one-way hashes.</Note>
    </form>
  );
}
