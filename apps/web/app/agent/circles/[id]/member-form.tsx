"use client";

import { useActionState, useEffect, useRef } from "react";
import type { FormState } from "../../actions";

const input = "mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2";

export function MemberForm({ action, remaining }: { action: (s: FormState, f: FormData) => Promise<FormState>; remaining: number }) {
  const [state, formAction, pending] = useActionState(action, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);

  return (
    <form ref={ref} action={formAction} className="mt-4 space-y-4 rounded border border-stone-200 bg-white p-4">
      <h2 className="font-semibold">
        Add a member <span className="font-normal text-stone-500">({remaining} to go)</span>
      </h2>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Name</span>
          <input name="name" required className={input} placeholder="First name and initial" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Business</span>
          <input name="business" required className={input} placeholder="e.g. Vegetable stall" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Mobile number</span>
          <input name="phone" required inputMode="tel" className={input} placeholder="0712 345 678" />
        </label>
        <label className="block">
          <span className="text-sm font-medium">National ID number</span>
          <input name="nationalId" required inputMode="numeric" className={input} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Weekly inflow (KSh)</span>
          <input name="weeklyInflowKes" required type="number" min={0} step={1} className={input} />
          <span className="text-xs text-stone-500">Average weekly money in, from their M-Pesa statement.</span>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Active loans at the credit bureau</span>
          <input name="activeLoans" required type="number" min={0} step={1} defaultValue={0} className={input} />
        </label>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input name="consent" type="checkbox" required className="mt-1" />
        <span>
          I explained the loan terms (flat 7% fee, 26 weekly payments) and how their data is used, and the member agreed.
          Each member has their own loan; the circle does not guarantee it.
        </span>
      </label>
      {state.error && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>}
      <button disabled={pending} className="rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
        {pending ? "Adding…" : "Add member"}
      </button>
      <p className="text-xs text-stone-500">Phone numbers and IDs are stored only as one-way hashes.</p>
    </form>
  );
}
