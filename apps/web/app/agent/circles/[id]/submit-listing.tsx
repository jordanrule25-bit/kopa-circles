"use client";

import { useActionState } from "react";
import { Alert, Button } from "@/components/ui";
import type { FormState } from "../../actions";

export function SubmitListing({ action, disabled }: { action: (s: FormState) => Promise<FormState>; disabled: boolean }) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form action={formAction} className="grid gap-2">
      {state.error && <Alert>{state.error}</Alert>}
      <Button variant="primary" disabled={disabled || pending} className="w-full py-3.5 text-[17px]">
        {pending ? "Submitting…" : "Submit for listing"}
      </Button>
    </form>
  );
}
