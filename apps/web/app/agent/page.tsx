import { prisma } from "@kopa/db";
import Link from "next/link";
import { STATUS_LABEL } from "@/lib/format";
import { requireAgent } from "@/lib/session";

export default async function AgentHome() {
  const agent = await requireAgent();
  const circles = await prisma.circle.findMany({
    where: { agentId: agent.userId },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { members: true } } },
  });

  return (
    <main>
      <div className="mt-6 flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Your circles</h1>
          <p className="text-sm text-stone-500">
            {agent.town} · {agent.partner.name}
          </p>
        </div>
        <Link href="/agent/circles/new" className="rounded bg-emerald-700 px-4 py-2 font-medium text-white hover:bg-emerald-800">
          New circle
        </Link>
      </div>

      {circles.length === 0 ? (
        <p className="mt-8 text-stone-600">No circles yet. Start one with “New circle”.</p>
      ) : (
        <ul className="mt-6 divide-y divide-stone-200 rounded border border-stone-200 bg-white">
          {circles.map((c) => (
            <li key={c.id}>
              <Link href={`/agent/circles/${c.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-stone-50">
                <span>
                  <span className="font-medium">{c.name}</span>
                  <span className="block text-sm text-stone-500">
                    {c.sector} · loan {c.cycle} · {c._count.members} of 5 members
                  </span>
                </span>
                <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs text-stone-700">{STATUS_LABEL[c.status]}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
