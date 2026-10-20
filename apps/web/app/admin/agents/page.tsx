import { prisma } from "@kopa/db";
import { Chip, PageHead, Panel } from "@/components/ui";
import { requireAdmin } from "@/lib/session";
import { setAgentActive } from "./actions";
import { AgentForm } from "./agent-form";

export const metadata = { title: "Agents" };

export default async function Agents() {
  await requireAdmin();
  const [agents, partners] = await Promise.all([
    prisma.agent.findMany({
      include: { user: { include: { sessions: { where: { revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } } } }, partner: true, _count: { select: { circles: true } } },
      orderBy: [{ active: "desc" }, { town: "asc" }],
    }),
    prisma.partner.findMany({ orderBy: { name: "asc" } }),
  ]);
  return (
    <>
      <PageHead title="Field agents" sub="Agents sign in with a code texted to the phone number you register here." />
      <Panel>
        <h2 className="text-xl font-semibold">Add an agent</h2>
        <AgentForm partners={partners} />
      </Panel>
      <Panel>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Agent</th>
                <th>Town</th>
                <th className="r">Circles</th>
                <th>Status</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {agents.map((a) => (
                <tr key={a.userId}>
                  <td>
                    {a.user.name ?? "Unnamed"}
                    <div className="num text-xs text-muted">{a.user.phone}</div>
                  </td>
                  <td>
                    {a.town}
                    <div className="text-xs text-muted">{a.partner.name}</div>
                  </td>
                  <td className="r num">{a._count.circles}</td>
                  <td>
                    <Chip tone={a.active ? "good" : "neutral"}>{a.active ? `Active · ${a.user.sessions.length} signed in` : "Deactivated"}</Chip>
                  </td>
                  <td className="r">
                    <form action={setAgentActive.bind(null, a.userId, !a.active)}>
                      <button className={`text-sm font-medium hover:underline ${a.active ? "text-bad" : "text-accent"}`}>{a.active ? "Deactivate" : "Reactivate"}</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted">Deactivating signs the agent out on every device straight away, for example if a phone is lost.</p>
      </Panel>
    </>
  );
}
