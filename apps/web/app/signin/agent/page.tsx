import Link from "next/link";
import { redirect } from "next/navigation";
import { Leaf } from "@/components/plants";
import { currentUser, devLoginEnabled, HOME } from "@/lib/session";
import { AgentSignIn } from "./agent-form";

export const metadata = { title: "Agent sign in" };

export default async function AgentSignInPage() {
  const user = await currentUser();
  if (user) redirect(HOME[user.role] ?? "/");
  return (
    <section className="agent mx-auto grid w-full max-w-md gap-6 py-6">
      <div className="grid justify-items-center gap-3 text-center">
        <Leaf size={44} />
        <h1 className="text-4xl font-semibold">Agent sign in</h1>
        <p className="text-muted">Use the phone number your Kopa admin registered.</p>
      </div>
      <div className="rounded-card bg-surface p-6 shadow-card">
        <AgentSignIn devOutbox={devLoginEnabled()} />
      </div>
      <p className="text-center text-sm text-muted">
        Lending or running Kopa?{" "}
        <Link href="/signin" className="font-medium text-accent hover:underline">
          Sign in with email ›
        </Link>
      </p>
    </section>
  );
}
