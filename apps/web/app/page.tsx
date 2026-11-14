import { aprFromFlatFee, FEE_BPS, WEEKS } from "@kopa/core";
import { portfolioStats, prisma } from "@kopa/db";
import Link from "next/link";
import { CircleCard } from "@/components/circle-card";
import { CircleCover } from "@/components/circle-cover";
import {
  Dateline,
  DispatchItem,
  LedgerButton,
  LedgerLink,
  LedgerRow,
  LedgerTicker,
  Qa,
  SectionNo,
} from "@/components/ledger";
import { Empty } from "@/components/ui";
import { loadCircles, summarize } from "@/lib/circles";
import { kes, pct, usd0 } from "@/lib/format";
import { currentFx } from "@/lib/fx";
import { currentUser } from "@/lib/session";

// Launch date: 2026-10-20 (from project memory). "Edition" counts weeks since.
const LAUNCH = new Date("2026-10-20T00:00:00Z");
const weeksSince = (now: Date) => Math.max(1, Math.ceil((now.getTime() - LAUNCH.getTime()) / (7 * 24 * 60 * 60 * 1000)));
const pad2 = (n: number) => String(n).padStart(2, "0");

const FILTERS = [
  { key: "open", label: "Raising now" },
  { key: "repaying", label: "Repaying" },
  { key: "all", label: "All" },
] as const;

const FAQ = [
  {
    q: "Do I earn interest?",
    a: "No, never. You get back the principal you lent and nothing more. Keeping it at 0% keeps Kopa a lending community rather than an investment product.",
  },
  {
    q: "Can I lose money?",
    a: "Yes. If a member can't repay, their circle can step in, then the first-loss reserve covers unpaid principal. Only if the reserve runs out do lenders lose some or all of their share. You also carry the exchange-rate risk between dollars and shillings.",
  },
  {
    q: "What do borrowers pay?",
    a: `A flat 7% fee over 26 weekly payments, about ${pct(aprFromFlatFee(FEE_BPS, WEEKS))} a year. The fee and optional lender tips pay for field agents and running the platform. Separately, 1.5% of every loan goes into the first-loss reserve.`,
  },
  {
    q: "Who decides who can borrow?",
    a: "People form their own circle of five. A field agent checks each member's M-Pesa inflow and credit-bureau record; no one can borrow more than a quarter of their weekly income can repay, and first loans are capped at $150.",
  },
  {
    q: "What happens if someone falls behind?",
    a: "The circle talks it through at their weekly meeting, and each loan gets one free reschedule for a documented shock like illness. There's no public shaming, no contacting people's phone contacts, and no home visits.",
  },
  {
    q: "Is the money really going to Kenya?",
    a: "Yes. A licensed Kenyan lending partner sends each member their loan on M-Pesa and collects repayments. During the pilot build, everyone shown on this site is fictional sample data.",
  },
];

export default async function Home({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const show = (await searchParams).show ?? "open";
  const user = await currentUser();
  const today = new Date();
  const fx = currentFx();
  const statuses = show === "open" ? ["RAISING"] : show === "repaying" ? ["REPAYING"] : ["RAISING", "REPAYING", "COMPLETE"];

  const [circles, raising, stats, funded, lenders] = await Promise.all([
    loadCircles({ status: { in: statuses as ("RAISING" | "REPAYING" | "COMPLETE")[] } }),
    loadCircles({ status: "RAISING" }),
    portfolioStats(prisma, today, fx),
    prisma.loan.findMany({ where: { status: { in: ["REPAYING", "CLOSED", "DEFAULTED"] } }, select: { circle: { select: { town: true } } } }),
    prisma.lenderShare.findMany({ distinct: ["lenderId"], select: { lenderId: true } }),
  ]);
  const towns = new Set(funded.map((l) => l.circle.town));
  const lenderId = user?.lender?.userId;
  const edition = pad2(weeksSince(today));
  const todayShort = today.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

  // Ticker items: a running snapshot of today's ledger.
  const tickerItems = [
    { label: "lent to date", value: usd0(stats.disbursedUsd) },
    { label: "reserve", value: kes(stats.reserveKes) },
    { label: "circles raising", value: String(raising.length) },
    { label: "on time", value: pct(stats.onTimeRate) },
  ];

  return (
    <div className="grid gap-16 sm:gap-20">
      {/* Dateline flag + ticker — the signature "it's a ledger" element */}
      <div className="grid gap-0">
        <Dateline edition={edition} place="Nakuru & Mombasa, Kenya" date={todayShort} />
        <LedgerTicker items={tickerItems} />
      </div>

      {/* Masthead — editorial hero, warmed up by a golden-hour wash.
          Dateline above stays stark; this band is the invitation. */}
      <section className="relative -mx-5 overflow-hidden hero-wash px-5 pb-10 pt-10 sm:pt-14">
        <div className="relative grid gap-6">
          <span className="kicker text-base sm:text-lg">
            A circle of five. One loan each. Lenders earn nothing — and everyone goes further.
          </span>
          <h1 className="max-w-4xl text-[clamp(2.8rem,7vw,5.5rem)] leading-[0.98] font-display">
            Small loans that grow together.
          </h1>
          <div className="grid max-w-5xl gap-8 border-y border-fg py-6 sm:grid-cols-[2fr_1fr] sm:items-start sm:gap-14">
            <p className="max-w-xl text-lg leading-relaxed text-fg sm:text-xl">
              Lend $25 to a circle of five small-business owners in Kenya. They repay weekly on M-Pesa; your share comes
              back to lend again. The circle covers for anyone who falls behind, then a first-loss reserve, before
              lenders feel a thing.
            </p>
            <aside className="grid gap-3 text-sm leading-relaxed text-muted">
              <div>
                <span className="label block">The product in a line</span>
                <span>Kiva's lender product, Grameen's circle mechanics, M-Pesa rails. No MFI in the middle.</span>
              </div>
              <div>
                <span className="label block">Lender return</span>
                <span className="num font-medium text-fg">0.00% — principal only</span>
              </div>
              <div>
                <span className="label block">Borrower cost</span>
                <span className="num font-medium text-fg">7.00% flat · 26 weekly payments</span>
              </div>
            </aside>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <LedgerButton href="#circles">Lend $25 — browse circles</LedgerButton>
            <LedgerLink href="#how">Read how it works</LedgerLink>
            <span className="text-sm text-muted">Takes about a minute.</span>
          </div>
        </div>
      </section>

      {/* No. 01 — Loans in motion. Dense running list of circles raising. */}
      <section id="circles" className="grid scroll-mt-24 gap-6">
        <SectionNo
          no="01"
          title="Loans in motion"
          sub={`${raising.length} circles are raising from lenders right now${stats.disbursedUsd ? `, ${usd0(stats.disbursedUsd)} already lent across the pilot.` : "."}`}
          rightSlot={
            <nav className="flex gap-4 text-sm" aria-label="Filter circles">
              {FILTERS.map((f) => (
                <Link
                  key={f.key}
                  href={f.key === "open" ? "/#circles" : `/?show=${f.key}#circles`}
                  scroll={false}
                  aria-current={show === f.key ? "true" : undefined}
                  className={`${show === f.key ? "text-fg underline underline-offset-4" : "text-muted hover:text-fg"}`}
                >
                  {f.label}
                </Link>
              ))}
            </nav>
          }
        />

        {raising.slice(0, 3).length > 0 && (
          <div className="grid gap-4 border-b border-line pb-8 sm:grid-cols-3">
            {raising.slice(0, 3).map((c) => {
              const sum = summarize(c, today);
              const pctFunded = sum.targetCents ? Math.min(100, Math.round((sum.fundedCents / sum.targetCents) * 100)) : 0;
              const toGo = Math.max(0, sum.targetCents - sum.fundedCents);
              return (
                <Link
                  key={c.id}
                  href={`/circles/${c.id}`}
                  className="group grid gap-3 border border-line p-4 transition-colors hover:border-fg"
                  style={{ borderRadius: 4 }}
                >
                  <CircleCover id={c.id} names={c.members.filter((m) => m.loans.length).map((m) => m.name)} size="md" />
                  <div className="grid gap-1">
                    <div className="kicker not-italic text-xs">Circle · {c.town}</div>
                    <div className="font-display text-xl leading-tight">{c.name}</div>
                    <div className="text-sm text-muted">
                      {c.members.length} members · {c.sector}
                    </div>
                  </div>
                  <div className="mt-1 grid gap-1.5">
                    <div className="flex items-baseline justify-between gap-2 text-xs text-muted">
                      <span>
                        Raising <span className="num font-medium text-fg">{usd0(sum.fundedCents)}</span> of{" "}
                        <span className="num">{usd0(sum.targetCents)}</span>
                      </span>
                      <span className="num">{toGo ? `${usd0(toGo)} to go` : "fully funded"}</span>
                    </div>
                    <div className="h-1 overflow-hidden bg-surface-2" style={{ borderRadius: 1 }}>
                      <div className="h-full bg-clay" style={{ width: `${pctFunded}%`, borderRadius: 1 }} aria-hidden="true" />
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {circles.length === 0 ? (
          <Empty title="Nothing here right now">Every listed circle is funded. New circles list as agents submit them.</Empty>
        ) : (
          <div className="grid gap-5 sm:grid-cols-[repeat(auto-fill,minmax(310px,1fr))]">
            {circles.map((c) => (
              <CircleCard
                key={c.id}
                c={c}
                s={summarize(c, today)}
                mineCents={lenderId ? c.shares.filter((s) => s.lenderId === lenderId).reduce((t, s) => t + s.amountCents, 0) : 0}
                balanceCents={user?.lender ? user.lender.balanceCents : null}
              />
            ))}
          </div>
        )}
      </section>

      {/* A note from the pilot — a short editorial dispatch. Explicitly
          illustrative; honest about being sample pilot data. */}
      <section className="grid gap-5 border-y border-fg py-10 sm:grid-cols-[1fr_2fr] sm:gap-14">
        <div>
          <span className="kicker text-sm">A note from the pilot</span>
          <div className="mt-1 font-mono text-xs uppercase tracking-widest text-muted">Nakuru · 11 Nov</div>
        </div>
        <div className="grid gap-3">
          <p className="font-display text-xl leading-snug sm:text-2xl">
            "Ruth, Akinyi, Faith, Beatrice and Mary met at Ruth's tailoring stall this morning for their third weekly
            payment. Beatrice was short <span className="num">KSh 400</span> — a Friday customer hadn't settled — and
            the circle covered it from a small pot they keep for this. She'll top it up next week."
          </p>
          <p className="text-muted">
            Lenders earned <span className="num font-medium text-fg">0%</span> this week, by design. That isn't how
            we think the money matters here. — <em>Illustrative dispatch, pilot sample data.</em>
          </p>
        </div>
      </section>

      {/* No. 02 — How the circle math works. Numbered editorial, no icons. */}
      <section id="how" className="grid scroll-mt-24 gap-6">
        <SectionNo no="02" title="How the circle math works" sub="Three stages, about six months from first lender to final payment." />
        <div className="grid">
          <DispatchItem no="01" title="A circle forms">
            Five people who already know and trust each other apply together. A local agent sits with them, checks each
            member's M-Pesa inflow and credit-bureau record, and sets a cap no one can borrow past — a quarter of what
            their weekly income can repay. First loans cap at $150.
          </DispatchItem>
          <DispatchItem no="02" title="Lenders fund the circle">
            People around the world lend $25 or more. When the circle is fully funded, the licensed Kenyan partner sends
            each member their loan directly on M-Pesa the same day.
          </DispatchItem>
          <DispatchItem no="03" title="They repay, you re-lend">
            Members repay weekly at the circle meeting for 26 weeks. If someone is short, the circle talks it through
            and usually covers. Your share comes back to your Kopa balance, ready to lend to the next circle.
          </DispatchItem>
        </div>
      </section>

      {/* No. 03 — The safety net. Ordered list with rule lines. */}
      <section className="grid gap-6">
        <SectionNo
          no="03"
          title="The safety net, in order"
          sub={`When a payment is missed, lenders are the last to feel it. 1.5% of every loan goes into a first-loss reserve, currently ${kes(stats.reserveKes)}, and anyone can watch its balance.`}
        />
        <ol className="grid" aria-label="Who covers a missed payment, in order">
          <LedgerRow no="01" label="The member" sub="Pays weekly at the circle meeting." value="pays" />
          <LedgerRow no="02" label="Their circle" sub="Can chip in so a member doesn't fall behind. The pilot has seen this handle most short weeks." value="covers" />
          <LedgerRow no="03" label="The first-loss reserve" sub="1.5% of every loan disbursed. Pays out before lenders feel anything." value={kes(stats.reserveKes)} tone="clay" />
          <LedgerRow no="04" label="Lenders" sub="Lose only what the reserve can't cover. At current reserve depth, losses stay small." value="last" tone="accent" />
        </ol>
        <div>
          <LedgerLink href="/platform">See every number in the transparency report →</LedgerLink>
        </div>
      </section>

      {/* No. 04 — Public record. The numbers as a ruled table. */}
      <section className="grid gap-6">
        <SectionNo no="04" title="Public record" sub="Live from the ledger — updated on every page load." />
        <div className="grid">
          <LedgerRow no="01" label="People funded so far" value={String(funded.length)} tone="clay" />
          <LedgerRow no="02" label={towns.size === 1 ? "Town the pilot has reached" : "Towns the pilot has reached"} value={String(towns.size)} tone="clay" />
          <LedgerRow no="03" label="Lenders participating" value={String(lenders.length)} tone="clay" />
          <LedgerRow no="04" label="Weekly payments met on time or covered" value={pct(stats.onTimeRate)} tone="accent" />
        </div>
      </section>

      {/* No. 05 — Straight answers. Q&A as running copy, no accordion. */}
      <section className="mx-auto grid w-full max-w-3xl gap-6">
        <SectionNo no="05" title="Straight answers" />
        <div className="grid">
          {FAQ.map(({ q, a }) => (
            <Qa key={q} q={q} a={a} />
          ))}
        </div>
      </section>

      {/* Sign-off — editorial close, not a marketing CTA */}
      <section className="grid gap-3 border-t border-fg pt-6">
        <span className="kicker text-sm">— The Kopa editors</span>
        <p className="max-w-2xl text-lg text-fg">
          Every figure above came from the ledger. If you'd like a share of the next circle, $25 is enough to start.{" "}
          <LedgerLink href="#circles">Browse circles raising now</LedgerLink>.
        </p>
      </section>

      {/* Colophon — the small editorial signature a real publication carries.
          Honest about pilot state, credits the ledger, names the edition. */}
      <aside className="border-t border-line pt-4 font-mono text-[0.7rem] uppercase tracking-[0.18em] text-muted">
        Published from the Kopa ledger · Pilot edition {edition} · Nakuru & Mombasa, Kenya · With a licensed Kenyan
        lending partner · All people and amounts shown are fictional sample data
      </aside>
    </div>
  );
}
