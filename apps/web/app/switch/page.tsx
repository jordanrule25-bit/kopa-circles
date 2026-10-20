import { signOut } from "@/app/auth-actions";
import { Button, PageHead, Panel } from "@/components/ui";
import { currentUser } from "@/lib/session";

export const metadata = { title: "Different account needed" };

const WHAT: Record<string, string> = { admin: "an admin", agent: "an active field agent", lender: "a lender" };

export default async function Switch({ searchParams }: { searchParams: Promise<{ need?: string }> }) {
  const need = (await searchParams).need ?? "";
  const user = await currentUser();
  return (
    <Panel className="mx-auto max-w-xl">
      <PageHead title="That page needs a different account" />
      <p>
        You’re signed in as {user?.name ?? user?.email ?? user?.phone ?? "someone else"}, but this page is for {WHAT[need] ?? "another kind of account"}.
        Sign out and sign in with the right account.
      </p>
      <form action={signOut}>
        <Button variant="primary">Sign out</Button>
      </form>
    </Panel>
  );
}
