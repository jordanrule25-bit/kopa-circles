"use client";

import { useActionState } from "react";
import type { FormState } from "../../actions";

export function SubmitListing({ action, disabled }: { action: (s: FormState) => Promise<FormState>; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="space-y-2">
      {state.error && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>}
      <button
        disabled={disabled || pending}
        className="rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {pending ? "Submitting…" : "Submit for listing"}
      </button>
    </form>
  );
}
