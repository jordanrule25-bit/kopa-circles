import { aprFromFlatFee, kesToUsdCents } from "@kopa/core";
import { portfolioStats, prisma } from "@kopa/db";
import { BalanceChart, CollectionsChart } from "@/components/charts";
import { Note, Panel, Stat, Stats } from "@/components/ui";
import { date, kes, pct, usd, usd0 } from "@/lib/format";
import { currentFx } from "@/lib/fx";
import { reserveHistory, weeklyCollections } from "@/lib/report";

export const metadata = { title: "Transparency report" };

export default async function Platform() {
  const fx = currentFx();
  const now = new Date();
  const [s, circles, recent, weeks, reserve, lenders] = await Promise.all([
    portfolioStats(prisma, now, fx),
    prisma.circle.groupBy({ by: ["status"], _count: true }),
    prisma.ledgerEvent.findMany({
      where: { kind: { in: ["DISBURSEMENT", "LOAN_CLOSED", "RESERVE_OUT", "LENDER_LOSS"] } },
      orderBy: { at: "desc" },
      take: 10,
      include: { circle: true, loan: { include: { member: true } } },
    }),
    weeklyCollections(now),
    reserveHistory(),
    prisma.lenderShare.aggregate({ _sum: { amountCents: true, repaidCents: true, lostCents: true } }),
  ]);
  const count = (st: string) => circles.find((c) => c.status === st)?._count ?? 0;
  const collected = weeks.reduce((t, w) => t + w.memberKes + w.circleKes, 0);
  const coveredShare = collected ? weeks.reduce((t, w) => t + w.circleKes, 0) / collected : 0;

  const line = (e: (typeof recent)[number]) => {
    const who = e.loan?.member ? `${e.loan.member.name.split(" ")[0]} in ${e.circle?.name}` : e.circle?.name;
    switch (e.kind) {
      case "DISBURSEMENT":
        return `${kes(e.amountMinor)} sent to ${who}`;
      case "LOAN_CLOSED":
        return (e.meta as { status?: string }).status === "CLOSED" ? `${who} repaid in full` : `${who}'s loan closed unpaid`;
      case "RESERVE_OUT":
        return `Reserve covered ${kes(e.amountMinor)} for ${who}`;
      default:
        return `Lenders lost ${usd(e.amountMinor)} on ${who}`;
    }
  };

  return (
    <div className="grid gap-16">
      <section className="grid max-w-3xl gap-4">
        <span className="text-sm font-medium text-accent">Transparency report · {date(now)}</span>
        <h1 className="text-5xl font-semibold leading-[1.05] sm:text-6xl">Every shilling, in the open.</h1>
        <p className="text-xl text-muted">
          These numbers come straight from the ledger that records every loan, payment and payout. Nothing is rounded up or left out.
        </p>
      </section>

      <section aria-label="Headline" className="grid gap-2">
        <div className="label">Paid on time or covered by the circle</div>
        <div className="num text-7xl font-semibold tracking-tight sm:text-8xl">{pct(s.onTimeRate)}</div>
        <p className="text-muted">
          of {s.dueCount} weekly payments due so far. The circle stepped in on {s.coveredByCircle}.
        </p>
      </section>

      <Stats>
        <Stat label="Lent to members" value={usd0(s.disbursedUsd)} sub={`${kes(s.disbursedKes)} · ${count("REPAYING") + count("COMPLETE")} circles`} />
        <Stat label="Repaid to lenders" value={usd(lenders._sum.repaidCents ?? 0)} sub={`of ${usd0(lenders._sum.amountCents ?? 0)} lent`} />
        <Stat label="30+ days late" value={pct(s.par30)} sub={`of ${kes(s.outstandingKes)} still owed`} />
        <Stat label="Lender losses" value={usd(s.lenderLossCents)} sub="After circle and reserve cover" />
      </Stats>

      <Panel>
        <div>
          <h2 className="text-2xl font-semibold">Weekly repayments</h2>
          <p className="text-muted">
            What fell due each week, and who paid it. The circle covered {pct(coveredShare)} of everything collected.
          </p>
        </div>
        {weeks.length ? (
          <CollectionsChart
            rows={weeks.map((w) => ({
              iso: w.week.toISOString(),
              label: w.week.toLocaleDateString("en-GB", { day: "numeric", month: "short", timeZone: "UTC" }),
              a: w.memberKes / 100,
              b: w.circleKes / 100,
              rest: w.unpaidKes / 100,
            }))}
            labels={{ a: "Paid by the member", b: "Covered by the circle", rest: "Not paid yet" }}
          />
        ) : (
          <p className="text-muted">No repayments are due yet.</p>
        )}
      </Panel>

      <Panel>
        <div>
          <h2 className="text-2xl font-semibold">First-loss reserve</h2>
          <p className="text-muted">
            {kes(s.reserveKes)} today. It grows by 1.5% of every loan and pays out only to cover unpaid principal before lenders lose anything.{" "}
            {s.reservePaidOutKes ? `${kes(s.reservePaidOutKes)} paid out so far.` : "Nothing has been paid out yet."}
          </p>
        </div>
        <BalanceChart points={reserve.map((p) => ({ iso: p.at.toISOString(), value: p.balanceKes / 100 }))} label="Reserve balance" today={now.toISOString()} />
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel>
          <h2 className="text-2xl font-semibold">Where the money goes</h2>
          <dl className="grid gap-3">
            {[
              ["Borrowers pay", `A flat 7% fee over 26 weeks, about ${pct(aprFromFlatFee(700, 26))} a year`],
              ["Lenders earn", "0%, always. Principal comes back weekly."],
              ["The reserve gets", "1.5% of every loan disbursed"],
              ["Kopa runs on", `Borrower fees and lender tips: ${usd0(kesToUsdCents(s.feeRevenueKes, fx) + s.tipsCents)} so far, ${usd0(s.tipsCents)} of it tips`],
            ].map(([k, v]) => (
              <div key={k} className="grid gap-0.5 border-b border-line pb-3 last:border-0 last:pb-0">
                <dt className="label">{k}</dt>
                <dd>{v}</dd>
              </div>
            ))}
          </dl>
        </Panel>
        <Panel>
          <h2 className="text-2xl font-semibold">Recent activity</h2>
          <ul className="grid gap-2 text-sm">
            {recent.map((e) => (
              <li key={e.id} className="flex gap-3">
                <span className="num w-24 flex-none text-muted">{date(e.at)}</span>
                <span>{line(e)}</span>
              </li>
            ))}
          </ul>
          <Note>
            Circles: {count("RAISING")} raising, {count("REPAYING")} repaying, {count("COMPLETE")} complete. Amounts at KSh {fx.kesPerUsd} per dollar. Pilot
            build: all people and amounts are fictional sample data.
          </Note>
        </Panel>
      </div>
    </div>
  );
}
