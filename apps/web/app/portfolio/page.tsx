import { prisma } from "@kopa/db";
import Link from "next/link";
import { Chip, Empty, PageHead, Panel, Progress, Stat, Stats } from "@/components/ui";
import { circleInclude, statusChip, summarize } from "@/lib/circles";
import { date, usd, usd0 } from "@/lib/format";
import { requireLender } from "@/lib/session";

export const metadata = { title: "My portfolio" };

export default async function Portfolio() {
  const lender = await requireLender();
  const [shares, events] = await Promise.all([
    prisma.lenderShare.findMany({ where: { lenderId: lender.userId }, include: { circle: { include: circleInclude } }, orderBy: { createdAt: "desc" } }),
    prisma.ledgerEvent.findMany({ where: { lenderId: lender.userId }, orderBy: { at: "desc" }, take: 30, include: { circle: true } }),
  ]);
  const tips = await prisma.ledgerEvent.aggregate({ where: { lenderId: lender.userId, kind: "TIP" }, _sum: { amountMinor: true } });

  const today = new Date();
  const lent = shares.reduce((t, s) => t + s.amountCents, 0);
  const repaid = shares.reduce((t, s) => t + s.repaidCents, 0);
  const lost = shares.reduce((t, s) => t + s.lostCents, 0);
  const outstanding = shares.filter((s) => s.circle && s.circle.status !== "COMPLETE").reduce((t, s) => t + Math.max(0, s.amountCents - s.repaidCents - s.lostCents), 0);

  // One row per circle, summing repeat stakes.
  const byCircle = new Map<string, { circle: NonNullable<(typeof shares)[number]["circle"]>; amount: number; repaid: number; lost: number }>();
  for (const s of shares) {
    if (!s.circle) continue;
    const row = byCircle.get(s.circle.id) ?? { circle: s.circle, amount: 0, repaid: 0, lost: 0 };
    row.amount += s.amountCents;
    row.repaid += s.repaidCents;
    row.lost += s.lostCents;
    byCircle.set(s.circle.id, row);
  }

  const LABEL: Record<string, string> = {
    LENDER_DEPOSIT: "Added money",
    LENDER_FUNDED: "Lent",
    LENDER_PAYOUT: "Repaid to you",
    LENDER_LOSS: "Lost",
    TIP: "Tip",
  };

  return (
    <>
      <PageHead title="My portfolio" sub={`${lender.user.name ?? lender.user.email} · principal back, 0% interest`} />
      <Stats>
        <Stat label="Available to lend" value={usd(lender.balanceCents)} sub="Repayments land here weekly" testId="pf-balance" />
        <Stat label="Lent in total" value={usd0(lent)} sub={`${byCircle.size} circles`} />
        <Stat label="Still outstanding" value={usd(outstanding)} sub="Raising or repaying" />
        <Stat label="Repaid to you" value={usd(repaid)} sub="Principal only, 0% interest" />
        <Stat label="Lost" value={usd(lost)} sub="After circle and reserve cover" />
        <Stat label="Tips you gave" value={usd(tips._sum.amountMinor ?? 0)} sub="Funds the platform" />
      </Stats>

      {byCircle.size === 0 ? (
        <Empty title="You haven't lent yet">
          Pick a circle on the{" "}
          <Link href="/" className="text-accent underline">
            Lend
          </Link>{" "}
          page.
        </Empty>
      ) : (
        <Panel>
          <h2 className="text-xl font-semibold">Your circles</h2>
          <div className="overflow-x-auto">
            <table className="data">
              <thead>
                <tr>
                  <th>Circle</th>
                  <th>Status</th>
                  <th className="r">Lent</th>
                  <th className="r">Repaid</th>
                  <th className="r">Lost</th>
                  <th className="min-w-[120px]">Progress</th>
                </tr>
              </thead>
              <tbody>
                {[...byCircle.values()].map(({ circle, amount, repaid: r, lost: l }) => {
                  const s = summarize(circle, today);
                  const st = statusChip(circle, s);
                  const raising = circle.status === "RAISING";
                  return (
                    <tr key={circle.id}>
                      <td>
                        <Link href={`/circles/${circle.id}`} className="font-medium text-accent hover:underline">
                          {circle.name}
                        </Link>
                        <div className="text-xs text-muted">{circle.town}</div>
                      </td>
                      <td>
                        <Chip tone={st.tone}>{st.label}</Chip>
                      </td>
                      <td className="r num">{usd0(amount)}</td>
                      <td className="r num">{usd(r)}</td>
                      <td className="r num">{usd(l)}</td>
                      <td>
                        <Progress value={raising ? (s.targetCents ? s.fundedCents / s.targetCents : 0) : amount ? r / amount : 0} tone={raising ? "sun" : "good"} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>
      )}

      <Panel>
        <h2 className="text-xl font-semibold">Activity</h2>
        {events.length === 0 ? (
          <p className="text-muted">Nothing yet.</p>
        ) : (
          <ul className="grid gap-1.5 text-sm">
            {events.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="num w-28 flex-none text-muted">{date(e.at)}</span>
                <span className="flex-1">
                  {LABEL[e.kind] ?? e.kind}
                  {e.circle ? ` · ${e.circle.name}` : ""}
                </span>
                <span className="num">{e.kind === "LENDER_FUNDED" || e.kind === "LENDER_LOSS" ? `−${usd(e.amountMinor)}` : usd(e.amountMinor)}</span>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
