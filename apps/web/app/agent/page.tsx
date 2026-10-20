import { prisma } from "@kopa/db";
import Link from "next/link";
import { GrowthStage } from "@/components/plants";
import { ButtonLink, Chip, Empty, PageHead } from "@/components/ui";
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
    <>
      <PageHead
        title="My circles"
        sub={`${agent.town} · ${agent.partner.name}`}
        action={
          <ButtonLink href="/agent/circles/new" variant="primary">
            New circle
          </ButtonLink>
        }
      />
      {circles.length === 0 ? (
        <Empty title="No circles yet">Start one with “New circle”, then add its five members.</Empty>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-card bg-surface shadow-card">
          {circles.map((c) => (
            <li key={c.id}>
              <Link href={`/agent/circles/${c.id}`} className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-surface-2/60">
                <span className="flex items-center gap-3">
                  <GrowthStage status={c.status} />
                  <span>
                  <span className="font-semibold">{c.name}</span>
                  <span className="block text-sm text-muted">
                    {c.sector} · loan {c.cycle} · {c._count.members} of 5 members
                  </span>
                  </span>
                </span>
                <Chip tone={c.status === "REPAYING" || c.status === "RAISING" ? "good" : "neutral"}>{STATUS_LABEL[c.status]}</Chip>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
