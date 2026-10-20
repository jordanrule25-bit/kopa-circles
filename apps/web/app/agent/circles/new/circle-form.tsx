"use client";

import { useActionState, useState } from "react";
import { ActionBar } from "@/components/agent-ui";
import { Alert, Button } from "@/components/ui";
import { createCircle, type FormState } from "../../actions";

export function CircleForm({ town, sectors }: { town: string; sectors: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createCircle, {});
  const [sector, setSector] = useState(sectors[0] ?? "");
  const [cycle, setCycle] = useState(1);

  return (
    <form action={action} className="grid gap-5">
      <section className="grid gap-4 rounded-card bg-surface p-5 shadow-card">
        <label className="field">
          <span>Circle name</span>
          <input name="name" required autoCapitalize="words" autoComplete="off" placeholder="e.g. Mama Mboga Five" />
        </label>
        <label className="field">
          <span>Town</span>
          <input name="town" required defaultValue={town} autoCapitalize="words" />
        </label>
      </section>

      <fieldset className="grid gap-3 rounded-card bg-surface p-5 shadow-card">
        <legend className="float-left mb-1 w-full text-sm font-medium text-muted">Sector</legend>
        <input type="hidden" name="sector" value={sector} />
        <div className="flex flex-wrap gap-2">
          {sectors.map((s) => (
            <button
              key={s}
              type="button"
              aria-pressed={sector === s}
              onClick={() => setSector(s)}
              className={`min-h-11 rounded-full px-4 text-[15px] font-medium transition-colors ${sector === s ? "bg-fg text-bg" : "bg-surface-2 hover:bg-line"}`}
            >
              {s}
            </button>
          ))}
        </div>
      </fieldset>

      <section className="flex items-center justify-between gap-4 rounded-card bg-surface p-5 shadow-card">
        <div>
          <div className="font-medium">Loan cycle</div>
          <div className="text-sm text-muted">1 for a first loan. The cap rises 30% per on-time cycle.</div>
        </div>
        <input type="hidden" name="cycle" value={cycle} />
        <div className="flex items-center gap-3">
          <button type="button" aria-label="One fewer cycle" onClick={() => setCycle((c) => Math.max(1, c - 1))} className="h-11 w-11 rounded-full bg-surface-2 text-xl">
            −
          </button>
          <span className="num w-6 text-center text-xl font-semibold" aria-live="polite" aria-label={`Loan cycle ${cycle}`}>
            {cycle}
          </span>
          <button type="button" aria-label="One more cycle" onClick={() => setCycle((c) => Math.min(20, c + 1))} className="h-11 w-11 rounded-full bg-surface-2 text-xl">
            +
          </button>
        </div>
      </section>

      <section className="grid gap-4 rounded-card bg-surface p-5 shadow-card">
        <label className="field">
          <span>Their story</span>
          <textarea name="story" required rows={4} placeholder="Who they are, how long they've met, and what the loan is for. Lenders read this." />
        </label>
      </section>

      <ActionBar>
        {state.error && <Alert>{state.error}</Alert>}
        <Button variant="primary" disabled={pending} className="w-full py-3.5 text-[17px]">
          {pending ? "Creating…" : "Create circle"}
        </Button>
      </ActionBar>
    </form>
  );
}
