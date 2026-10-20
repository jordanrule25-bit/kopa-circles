import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf } from "@/components/plants";
import { Alert } from "@/components/ui";
import { currentUser, HOME, safeNext } from "@/lib/session";
import { EmailForm } from "./email-form";

export const metadata = { title: "Sign in" };

const ERRORS: Record<string, string> = { link: "That sign-in link has expired or was already used. Ask for a new one below." };

export default async function SignIn({ searchParams }: { searchParams: Promise<{ next?: string; error?: string; need?: string }> }) {
  const { next, error, need } = await searchParams;
  const user = await currentUser();
  if (user) redirect(safeNext(next) ?? HOME[user.role] ?? "/");
  return (
    <section className="mx-auto grid w-full max-w-md gap-6 py-6">
      <div className="grid justify-items-center gap-3 text-center">
        <Leaf size={44} />
        <h1 className="text-4xl font-semibold">Sign in</h1>
        <p className="text-muted">
          {need === "admin" ? "Admins sign in with their email." : "New to Kopa? Signing in creates your lender account. No password needed."}
        </p>
      </div>
      {error && ERRORS[error] && <Alert>{ERRORS[error]}</Alert>}
      <div className="rounded-card bg-surface p-6 shadow-card">
        <EmailForm next={safeNext(next) ?? undefined} />
      </div>
      <p className="text-center text-sm text-muted">
        Field agent?{" "}
        <Link href="/signin/agent" className="font-medium text-accent hover:underline">
          Sign in with your phone ›
        </Link>
      </p>
    </section>
  );
}
