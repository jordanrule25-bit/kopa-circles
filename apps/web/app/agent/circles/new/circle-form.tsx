"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import { createCircle, type FormState } from "../../actions";

export function CircleForm({ town, sectors }: { town: string; sectors: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createCircle, {});
  return (
    <form action={action} className="grid gap-4 rounded-card bg-surface shadow-card p-4">
      <label className="field">
        <span>Circle name</span>
        <input name="name" required placeholder="e.g. Mama Mboga Five" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="field">
          <span>Town</span>
          <input name="town" required defaultValue={town} />
        </label>
        <label className="field">
          <span>Sector</span>
          <select name="sector">
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Loan cycle</span>
          <input name="cycle" type="number" min={1} max={20} defaultValue={1} required />
          <span className="hint">1 for a first loan. The cap rises 30% per on-time cycle.</span>
        </label>
      </div>
      <label className="field">
        <span>Their story</span>
        <textarea name="story" required rows={3} placeholder="Who they are, how long they've met, and what the loan is for. Lenders read this." />
      </label>
      {state.error && <Alert>{state.error}</Alert>}
      <div>
        <Button variant="primary" disabled={pending}>
          {pending ? "Creating…" : "Create circle"}
        </Button>
      </div>
    </form>
  );
}
