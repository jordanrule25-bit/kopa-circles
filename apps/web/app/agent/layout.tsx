import { prisma } from "@kopa/db";
import Link from "next/link";
import { currentAgent } from "@/lib/session";
import { switchDevAgent } from "./actions";

export const dynamic = "force-dynamic";

export default async function AgentLayout({ children }: { children: React.ReactNode }) {
  const [agent, agents] = await Promise.all([
    currentAgent(),
    prisma.agent.findMany({ where: { active: true }, orderBy: { town: "asc" } }),
  ]);

  return (
    <div className="mx-auto max-w-3xl px-4 pb-16">
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 py-4">
        <Link href="/agent" className="font-semibold">
          Kopa Circles <span className="font-normal text-stone-500">· Agent</span>
        </Link>
        {agents.length > 0 && (
          <form action={switchDevAgent} className="flex items-center gap-2 text-sm">
            <label htmlFor="agentId" className="text-stone-500">
              Dev login:
            </label>
            <select
              id="agentId"
              name="agentId"
              defaultValue={agent?.userId}
              className="rounded border border-stone-300 bg-white px-2 py-1"
            >
              {agents.map((a) => (
                <option key={a.userId} value={a.userId}>
                  Agent, {a.town}
                </option>
              ))}
            </select>
            <button className="rounded border border-stone-300 bg-white px-2 py-1 hover:bg-stone-100">Switch</button>
          </form>
        )}
      </header>
      {agent ? (
        children
      ) : (
        <p className="mt-8 text-stone-600">
          No agents yet. Run <code>pnpm db:seed</code> to load the fictional sample agents.
        </p>
      )}
    </div>
  );
}
