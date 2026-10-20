import { prisma } from "@kopa/db";
import Link from "next/link";
import { lendToCircle } from "@/app/lend-actions";
import { CircleCover } from "@/components/circle-cover";
import { LendForm } from "@/components/lend-form";
import { Chip, Empty, PageHead, Panel, Progress, Stat, Stats } from "@/components/ui";
import { circleInclude, loadCircles, statusChip, summarize } from "@/lib/circles";
import { date, usd, usd0 } from "@/lib/format";
import { requireLender } from "@/lib/session";

export const metadata = { title: "My portfolio" };

export default async function Portfolio() {
  const lender = await requireLender();
  const [shares, events] = await Promise.all([
    prisma.lenderShare.findMany({ where: { lenderId: lender.userId }, include: { circle: { include: circleInclude } }, orderBy: { createdAt: "desc" } }),
    prisma.ledgerEvent.findMany({ where: { lenderId: lender.userId }, orderBy: { at: "desc" }, take: 30, include: { circle: true } }),
  ]);
  const [tips, raising] = await Promise.all([
    prisma.ledgerEvent.aggregate({ where: { lenderId: lender.userId, kind: "TIP" }, _sum: { amountMinor: true } }),
    lender.balanceCents >= 2_500 ? loadCircles({ status: "RAISING" }) : Promise.resolve([]),
  ]);

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

  // Where the money went: people and places reached through circles this lender funded.
  const reached = [...byCircle.values()].filter(({ circle }) => circle.status !== "RAISING");
  const people = reached.reduce((t, { circle }) => t + circle.members.filter((m) => m.loans.length).length, 0);
  const towns = new Set(reached.map(({ circle }) => circle.town));

  // Circles closest to being fully funded, for relending.
  const suggestions = raising
    .map((c) => ({ c, s: summarize(c, today) }))
    .filter(({ s }) => s.targetCents > s.fundedCents)
    .sort((a, b) => a.s.targetCents - a.s.fundedCents - (b.s.targetCents - b.s.fundedCents))
    .slice(0, 3);

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

      {people > 0 && (
        <p className="text-lg">
          Your loans have reached <span className="font-semibold">{people} people</span> in{" "}
          <span className="font-semibold">
            {towns.size} town{towns.size === 1 ? "" : "s"}
          </span>{" "}
          ({[...towns].join(", ")}).
        </p>
      )}

      {suggestions.length > 0 && (
        <section className="grid gap-4">
          <div>
            <h2 className="text-2xl font-semibold">Put your {usd(lender.balanceCents)} back to work</h2>
            <p className="text-muted">These circles are closest to being fully funded.</p>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {suggestions.map(({ c, s }) => (
              <Panel key={c.id} className="content-between">
                <CircleCover id={c.id} names={s.members.filter((m) => m.loan).map((m) => m.name)} size="sm" />
                <div>
                  <Link href={`/circles/${c.id}`} className="text-lg font-semibold hover:underline">
                    {c.name}
                  </Link>
                  <div className="text-sm text-muted">
                    {c.town} · {usd0(s.targetCents - s.fundedCents)} to go
                  </div>
                </div>
                <Progress value={s.targetCents ? s.fundedCents / s.targetCents : 0} tone="sun" />
                <LendForm compact action={lendToCircle.bind(null, c.id)} remainingCents={s.targetCents - s.fundedCents} balanceCents={lender.balanceCents} circleName={c.name} />
              </Panel>
            ))}
          </div>
        </section>
      )}

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
