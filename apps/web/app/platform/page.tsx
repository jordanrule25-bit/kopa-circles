import { aprFromFlatFee, kesToUsdCents } from "@kopa/core";
import { portfolioStats, prisma } from "@kopa/db";
import { BalanceChart, CollectionsChart } from "@/components/charts";
import {
  Dateline,
  DispatchItem,
  LedgerLink,
  LedgerRow,
  LedgerTicker,
  SectionNo,
} from "@/components/ledger";
import { SunGlow } from "@/components/motifs";
import { date, kes, pct, usd, usd0 } from "@/lib/format";
import { currentFx } from "@/lib/fx";
import { reserveHistory, weeklyCollections } from "@/lib/report";

export const metadata = { title: "Transparency report" };

const LAUNCH = new Date("2026-10-20T00:00:00Z");
const weeksSince = (now: Date) => Math.max(1, Math.ceil((now.getTime() - LAUNCH.getTime()) / (7 * 24 * 60 * 60 * 1000)));
const pad2 = (n: number) => String(n).padStart(2, "0");

export default async function Platform() {
  const fx = currentFx();
  const now = new Date();
  const [s, circles, recent, weeks, reserve, lenders] = await Promise.all([
    portfolioStats(prisma, now, fx),
    prisma.circle.groupBy({ by: ["status"], _count: true }),
    prisma.ledgerEvent.findMany({
      where: { kind: { in: ["DISBURSEMENT", "LOAN_CLOSED", "RESERVE_OUT", "LENDER_LOSS"] } },
      orderBy: { at: "desc" },
      take: 12,
      include: { circle: true, loan: { include: { member: true } } },
    }),
    weeklyCollections(now),
    reserveHistory(),
    prisma.lenderShare.aggregate({ _sum: { amountCents: true, repaidCents: true, lostCents: true } }),
  ]);
  const count = (st: string) => circles.find((c) => c.status === st)?._count ?? 0;
  const collected = weeks.reduce((t, w) => t + w.memberKes + w.circleKes, 0);
  const coveredShare = collected ? weeks.reduce((t, w) => t + w.circleKes, 0) / collected : 0;
  const edition = pad2(weeksSince(now));
  const todayShort = now.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

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

  const tickerItems = [
    { label: "lent to date", value: usd0(s.disbursedUsd) },
    { label: "reserve", value: kes(s.reserveKes) },
    { label: "circles", value: `${count("RAISING")}R · ${count("REPAYING")}P · ${count("COMPLETE")}C` },
    { label: "losses", value: usd(s.lenderLossCents) },
  ];

  return (
    <div className="grid gap-16 sm:gap-20">
      {/* Dateline + ticker */}
      <div className="grid gap-0">
        <Dateline edition={edition} place="Pilot ledger · Kenya" date={todayShort} />
        <LedgerTicker items={tickerItems} />
      </div>

      {/* Masthead */}
      <section className="grid gap-5">
        <span className="kicker text-base sm:text-lg">
          The transparency report, posted every week from the Kopa ledger.
        </span>
        <h1 className="max-w-4xl text-[clamp(2.6rem,6.5vw,5rem)] leading-[0.98] font-display">
          Every shilling, in the open.
        </h1>
        <p className="max-w-2xl border-t border-fg pt-4 text-lg leading-relaxed text-fg">
          These figures come straight from the ledger that records every loan, payment and payout. Nothing is rounded up
          or left out. When something breaks, you'll see it here first.
        </p>
      </section>

      {/* Headline — on-time percentage with sun-glow, flanked by a plain-language
          "what this means" column so the number reads as mission, not dashboard. */}
      <section aria-label="Headline" className="relative overflow-hidden border-y border-fg">
        <SunGlow />
        <div className="relative grid gap-10 px-6 py-12 sm:grid-cols-[1.1fr_1fr] sm:items-center sm:gap-14 sm:py-16">
          <div className="grid gap-3 text-center sm:text-left">
            <div className="label">Paid on time or covered by the circle</div>
            <div className="num display-num text-7xl text-accent sm:text-8xl">{pct(s.onTimeRate)}</div>
            <p className="max-w-xl text-muted sm:max-w-none">
              of {s.dueCount} weekly payments due so far. The circle stepped in on {s.coveredByCircle}.
            </p>
          </div>
          <aside className="grid gap-3 sm:border-l sm:border-line sm:pl-10">
            <span className="kicker text-sm">What this means for you</span>
            <p className="text-fg">
              If you've lent on Kopa, the pilot's loans are being paid back on their original weekly schedule, and the
              circle covers the gaps before any of your principal is at risk. Lenders have lost{" "}
              <span className="num font-medium">{usd(s.lenderLossCents)}</span> so far.
            </p>
            <p className="text-sm text-muted">
              Reserve balance: <span className="num font-medium text-fg">{kes(s.reserveKes)}</span>. It pays out before
              lenders feel a thing.
            </p>
          </aside>
        </div>
      </section>

      {/* No. 01 — Recent activity. Now the lead section. */}
      <section className="grid gap-6">
        <SectionNo no="01" title="From the ledger, this week" sub={`${recent.length} most recent events — newest first.`} />
        <ol className="grid">
          {recent.map((e, i) => (
            <li key={e.id} className="grid grid-cols-[48px_72px_1fr] items-baseline gap-4 border-b border-line py-4 last:border-b-0 sm:grid-cols-[48px_96px_1fr] sm:gap-6">
              <span className="num font-mono text-xs text-muted">{pad2(i + 1)}</span>
              <span className="num font-mono text-xs uppercase tracking-wider text-muted">{date(e.at)}</span>
              <span className="text-fg">{line(e)}</span>
            </li>
          ))}
        </ol>
      </section>

      {/* No. 02 — Public record (headline numbers as ruled rows) */}
      <section className="grid gap-6">
        <SectionNo no="02" title="Public record" sub="Headline numbers from the pilot." />
        <div className="grid">
          <LedgerRow no="01" label="Lent to members" sub={`${kes(s.disbursedKes)} · ${count("REPAYING") + count("COMPLETE")} circles`} value={usd0(s.disbursedUsd)} tone="clay" />
          <LedgerRow no="02" label="Repaid to lenders" sub={`of ${usd0(lenders._sum.amountCents ?? 0)} lent`} value={usd(lenders._sum.repaidCents ?? 0)} tone="clay" />
          <LedgerRow no="03" label="30+ days late" sub={`of ${kes(s.outstandingKes)} still owed`} value={pct(s.par30)} tone="clay" />
          <LedgerRow no="04" label="Lender losses" sub="After the circle and reserve have covered" value={usd(s.lenderLossCents)} tone="accent" />
        </div>
      </section>

      {/* No. 03 — Weekly repayments chart */}
      <section className="grid gap-6">
        <SectionNo
          no="03"
          title="Weekly repayments"
          sub={`What fell due each week, and who paid it. The circle covered ${pct(coveredShare)} of everything collected.`}
        />
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
      </section>

      {/* No. 04 — First-loss reserve */}
      <section className="grid gap-6">
        <SectionNo
          no="04"
          title="First-loss reserve"
          sub={`${kes(s.reserveKes)} today. It grows by 1.5% of every loan and pays out only to cover unpaid principal before lenders lose anything. ${
            s.reservePaidOutKes ? `${kes(s.reservePaidOutKes)} has been paid out so far.` : "Nothing has been paid out yet."
          }`}
        />
        <BalanceChart points={reserve.map((p) => ({ iso: p.at.toISOString(), value: p.balanceKes / 100 }))} label="Reserve balance" today={now.toISOString()} />
      </section>

      {/* No. 05 — Where the money goes. Dispatch-style explainer. */}
      <section className="grid gap-6">
        <SectionNo no="05" title="Where the money goes" sub="The arithmetic of a Kopa loan, laid out plainly." />
        <div className="grid">
          <DispatchItem no="01" title="Borrowers pay a flat 7% fee">
            Spread over 26 weekly payments — about {pct(aprFromFlatFee(700, 26))} a year, flat-rate. The fee pays field
            agents and keeps the platform running.
          </DispatchItem>
          <DispatchItem no="02" title="Lenders earn 0%, always">
            Principal comes back weekly through the circle's repayments. The 0% keeps Kopa a lending community, not an
            investment product.
          </DispatchItem>
          <DispatchItem no="03" title="The reserve gets 1.5% of every loan">
            A first-loss reserve, visible at all times. At present, {kes(s.reserveKes)} sits in it.
          </DispatchItem>
          <DispatchItem no="04" title="Kopa runs on fees and tips">
            Borrower fees plus optional lender tips so far: {usd0(kesToUsdCents(s.feeRevenueKes, fx) + s.tipsCents)},
            of which {usd0(s.tipsCents)} came from lender tips.
          </DispatchItem>
        </div>
      </section>

      {/* Sign-off */}
      <section className="grid gap-3 border-t border-fg pt-6">
        <span className="kicker text-sm">— The Kopa ledger</span>
        <p className="max-w-2xl text-sm text-muted">
          Circles today: {count("RAISING")} raising, {count("REPAYING")} repaying, {count("COMPLETE")} complete. All
          figures converted at KSh {fx.kesPerUsd} per dollar. <LedgerLink href="/">← Back to the circles</LedgerLink>
        </p>
      </section>

      {/* Colophon */}
      <aside className="border-t border-line pt-4 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
        Published from the Kopa ledger · Pilot edition {edition} · With a licensed Kenyan lending partner · All people
        and amounts shown are fictional sample data
      </aside>
    </div>
  );
}
