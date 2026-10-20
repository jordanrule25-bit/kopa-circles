import { PageHead, Panel } from "@/components/ui";

export const metadata = { title: "Switch account" };

const WHAT: Record<string, string> = {
  admin: "an admin",
  agent: "a field agent",
  lender: "a lender",
};

export default async function Switch({ searchParams }: { searchParams: Promise<{ need?: string }> }) {
  const need = (await searchParams).need ?? "";
  return (
    <Panel className="max-w-xl">
      <PageHead title="That page needs a different account" />
      <p>
        You need to be signed in as {WHAT[need] ?? "another user"}. During the pilot build, pick one from the account menu at the top right and
        press <strong>Switch</strong>.
      </p>
    </Panel>
  );
}
