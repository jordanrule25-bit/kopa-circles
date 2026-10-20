import { aprFromFlatFee, kesToUsdCents } from "@kopa/core";
import { portfolioStats, prisma } from "@kopa/db";
import { PageHead, Panel, Stat, Stats, Note } from "@/components/ui";
import { date, kes, pct, usd, usd0 } from "@/lib/format";
import { currentFx } from "@/lib/fx";

export const metadata = { title: "Platform" };

export default async function Platform() {
  const fx = currentFx();
  const now = new Date();
  const [s, circles, recent] = await Promise.all([
    portfolioStats(prisma, now, fx),
    prisma.circle.groupBy({ by: ["status"], _count: true }),
    prisma.ledgerEvent.findMany({
      where: { kind: { in: ["DISBURSEMENT", "LOAN_CLOSED", "RESERVE_OUT", "LENDER_LOSS"] } },
      orderBy: { at: "desc" },
      take: 12,
      include: { circle: true, loan: { include: { member: true } } },
    }),
  ]);
  const count = (st: string) => circles.find((c) => c.status === st)?._count ?? 0;

  const line = (e: (typeof recent)[number]) => {
    const who = e.loan?.member ? `${e.loan.member.name.split(" ")[0]} in ${e.circle?.name}` : e.circle?.name;
    switch (e.kind) {
      case "DISBURSEMENT":
        return `${kes(e.amountMinor)} sent to ${who}'s mobile wallet`;
      case "LOAN_CLOSED":
        return (e.meta as { status?: string }).status === "CLOSED" ? `${who} repaid in full` : `${who}'s loan closed unpaid`;
      case "RESERVE_OUT":
        return `Reserve covered ${kes(e.amountMinor)} for ${who}`;
      default:
        return `Lenders lost ${usd(e.amountMinor)} on ${who}`;
    }
  };

  return (
    <>
      <PageHead title="Platform" sub="Every number here is derived from the ledger. Updated live." />
      <Stats>
        <Stat label="Disbursed" value={usd0(s.disbursedUsd)} sub={`${count("REPAYING") + count("COMPLETE")} circles · ${kes(s.disbursedKes)}`} testId="stat-disbursed" />
        <Stat label="On-time rate" value={pct(s.onTimeRate)} sub={`${s.coveredByCircle} payments covered by circles`} />
        <Stat label="Portfolio at risk (30+ days)" value={pct(s.par30)} sub={`of ${kes(s.outstandingKes)} outstanding`} />
        <Stat label="Reserve balance" value={kes(s.reserveKes)} sub={`${kes(s.reservePaidOutKes)} paid out so far`} testId="stat-reserve" />
        <Stat label="Lender losses" value={usd(s.lenderLossCents)} sub="Beyond the reserve" />
        <Stat label="Fee and tip revenue" value={usd0(kesToUsdCents(s.feeRevenueKes, fx) + s.tipsCents)} sub={`Tips ${usd0(s.tipsCents)}`} />
      </Stats>
      <div className="grid gap-5 md:grid-cols-[1.2fr_1fr]">
        <Panel>
          <h2 className="text-lg font-semibold">Recent activity</h2>
          <ul className="grid gap-1.5 text-sm">
            {recent.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="num w-28 flex-none text-muted">{date(e.at)}</span>
                <span>{line(e)}</span>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel>
          <h2 className="text-lg font-semibold">How the money works</h2>
          <ul className="grid list-disc gap-1.5 pl-5 text-sm">
            <li>Borrowers pay a flat 7% fee over 26 weekly payments, about {pct(aprFromFlatFee(700, 26))} APR.</li>
            <li>Lenders get principal back and earn 0% interest, always.</li>
            <li>1.5% of every disbursement goes into the first-loss reserve.</li>
            <li>If a member misses a payment: the circle may cover it, then the reserve, and only then do lenders lose.</li>
            <li>No public shaming, no contacting phone contacts, no home visits. One free reschedule per loan for documented shocks.</li>
          </ul>
          <Note>Circles: {count("RAISING")} raising, {count("REPAYING")} repaying, {count("COMPLETE")} complete. As of {date(now)}.</Note>
        </Panel>
      </div>
    </>
  );
}
