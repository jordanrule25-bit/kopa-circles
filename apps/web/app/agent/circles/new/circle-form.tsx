"use client";

import { useActionState } from "react";
import { createCircle, type FormState } from "../../actions";

const input = "mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2";

export function CircleForm({ town, sectors }: { town: string; sectors: string[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(createCircle, {});
  return (
    <form action={action} className="mt-6 space-y-4">
      <label className="block">
        <span className="text-sm font-medium">Circle name</span>
        <input name="name" required className={input} placeholder="e.g. Mama Mboga Five" />
      </label>
      <div className="grid gap-4 sm:grid-cols-3">
        <label className="block">
          <span className="text-sm font-medium">Town</span>
          <input name="town" required defaultValue={town} className={input} />
        </label>
        <label className="block">
          <span className="text-sm font-medium">Sector</span>
          <select name="sector" className={input}>
            {sectors.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Loan cycle</span>
          <input name="cycle" type="number" min={1} max={20} defaultValue={1} required className={input} />
          <span className="text-xs text-stone-500">1 for a first loan. Raises the cap 30% per on-time cycle.</span>
        </label>
      </div>
      <label className="block">
        <span className="text-sm font-medium">Their story</span>
        <textarea
          name="story"
          required
          rows={3}
          className={input}
          placeholder="Who they are, how long they've met, and what the loan is for. Lenders read this."
        />
      </label>
      {state.error && <p role="alert" className="rounded bg-red-50 px-3 py-2 text-sm text-red-800">{state.error}</p>}
      <button disabled={pending} className="rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800 disabled:opacity-60">
        {pending ? "Creating…" : "Create circle"}
      </button>
    </form>
  );
}
