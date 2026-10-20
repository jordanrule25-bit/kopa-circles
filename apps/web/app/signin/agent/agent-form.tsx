"use client";

import Link from "next/link";
import { useActionState } from "react";
import { requestCode, verifyCode, type AuthState } from "@/app/auth-actions";
import { Alert, Button } from "@/components/ui";

export function AgentSignIn({ devOutbox }: { devOutbox: boolean }) {
  const [sent, sendAction, sending] = useActionState<AuthState, FormData>(requestCode, {});
  const [verified, verifyAction, verifying] = useActionState<AuthState, FormData>(verifyCode, {});
  const phone = verified.phone ?? sent.phone;

  if (!sent.sent) {
    return (
      <form action={sendAction} className="grid gap-4">
        <label className="field">
          <span>Your mobile number</span>
          <input name="phone" type="tel" inputMode="tel" autoComplete="tel" required placeholder="0712 345 678" defaultValue={sent.phone ?? ""} autoFocus />
        </label>
        {sent.error && <Alert>{sent.error}</Alert>}
        <Button variant="primary" disabled={sending} className="w-full py-3.5 text-[17px]">
          {sending ? "Sending…" : "Text me a code"}
        </Button>
      </form>
    );
  }

  return (
    <form action={verifyAction} className="grid gap-4">
      <input type="hidden" name="phone" value={phone ?? ""} />
      <p className="text-muted">If {phone} is registered to an agent, we just texted it a 6-digit code.</p>
      <label className="field">
        <span>Code</span>
        <input
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9 ]{6,7}"
          maxLength={7}
          required
          placeholder="123456"
          className="num text-center text-2xl tracking-[0.4em]"
          autoFocus
        />
      </label>
      {verified.error && <Alert>{verified.error}</Alert>}
      <Button variant="primary" disabled={verifying} className="w-full py-3.5 text-[17px]">
        {verifying ? "Checking…" : "Sign in"}
      </Button>
      {devOutbox && (
        <Link href="/dev/outbox" target="_blank" className="text-center text-sm font-medium text-accent hover:underline">
          Open the dev outbox ›
        </Link>
      )}
    </form>
  );
}
