"use client";

import { useActionState } from "react";
import { requestLink, type AuthState } from "@/app/auth-actions";
import { Alert, Button } from "@/components/ui";

export function EmailForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(requestLink, {});
  return (
    <form action={action} className="grid gap-4">
      <input type="hidden" name="next" value={next ?? ""} />
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" required autoComplete="email" inputMode="email" placeholder="you@example.com" autoFocus />
      </label>
      {state.error && <Alert>{state.error}</Alert>}
      <Button variant="primary" disabled={pending} className="w-full py-3">
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
