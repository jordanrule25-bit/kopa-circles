"use client";

import { useActionState, type ReactNode } from "react";
import type { AdminState } from "@/app/admin/actions";
import { Alert, Button } from "./ui";

/** A small form around one admin action, with its result shown inline. */
export function ActionForm({
  action,
  label,
  pendingLabel,
  children,
  variant = "primary",
  confirm,
}: {
  action: (s: AdminState, f: FormData) => Promise<AdminState>;
  label: string;
  pendingLabel?: string;
  children?: ReactNode;
  variant?: "primary" | "default" | "danger";
  confirm?: string;
}) {
  const [state, formAction, pending] = useActionState(action, {});
  return (
    <form
      action={formAction}
      className="grid gap-2"
      onSubmit={(e) => {
        if (confirm && !window.confirm(confirm)) e.preventDefault();
      }}
    >
      {children}
      <div>
        <Button variant={variant} size="sm" disabled={pending}>
          {pending ? (pendingLabel ?? "Saving…") : label}
        </Button>
      </div>
      {state.error && <Alert>{state.error}</Alert>}
      {state.ok && <Alert tone="good">{state.ok}</Alert>}
    </form>
  );
}
