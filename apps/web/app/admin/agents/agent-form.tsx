"use client";

import { useActionState, useEffect, useRef } from "react";
import { Alert, Button } from "@/components/ui";
import { addAgent, type AgentState } from "./actions";

export function AgentForm({ partners }: { partners: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<AgentState, FormData>(addAgent, {});
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (state.ok) ref.current?.reset();
  }, [state]);
  return (
    <form ref={ref} action={action} className="grid gap-4 sm:grid-cols-2">
      <label className="field">
        <span>Name</span>
        <input name="name" required autoComplete="off" />
      </label>
      <label className="field">
        <span>Mobile number</span>
        <input name="phone" type="tel" required placeholder="0712 345 678" />
      </label>
      <label className="field">
        <span>Town</span>
        <input name="town" required />
      </label>
      <label className="field">
        <span>Lending partner</span>
        <select name="partnerId" required>
          {partners.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </label>
      <div className="grid gap-2 sm:col-span-2">
        {state.error && <Alert>{state.error}</Alert>}
        {state.ok && <Alert tone="good">{state.ok}</Alert>}
        <div>
          <Button variant="primary" disabled={pending}>
            {pending ? "Adding…" : "Add agent"}
          </Button>
        </div>
      </div>
    </form>
  );
}
