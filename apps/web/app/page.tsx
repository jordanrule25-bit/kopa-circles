import { aprFromFlatFee, FEE_BPS, WEEKS } from "@kopa/core";
import { portfolioStats, prisma } from "@kopa/db";
import Link from "next/link";
import { CircleCard } from "@/components/circle-card";
import { CircleCover } from "@/components/circle-cover";
import { AcaciaHorizon, CircleOfFive, HandRule, Kicker } from "@/components/motifs";
import { Bloom, Seed, Sprout } from "@/components/plants";
import { Empty } from "@/components/ui";
import { loadCircles, summarize } from "@/lib/circles";
import { kes, pct, usd0 } from "@/lib/format";
import { currentFx } from "@/lib/fx";
import { currentUser } from "@/lib/session";

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
  const featured = raising.slice(0, 3);
  const lenderId = user?.lender?.userId;

  return (
    <div className="grid gap-20 sm:gap-28">
      {/* Hero — editorial two-column spread. Left: kicker, headline, body, CTAs.
          Right: featured circles tucked in. Words lead, cards follow. */}
      <section className="relative -mx-5 overflow-hidden rounded-[32px] hero-wash px-5 pb-12 pt-8 sm:pt-16">
        <div className="relative grid gap-10 lg:grid-cols-[1.55fr_1fr] lg:items-start lg:gap-14">
          <div className="grid gap-5">
            <Kicker>A circle of five. One loan each. Lenders earn nothing — and everyone goes further.</Kicker>
            <h1 className="max-w-3xl text-5xl leading-[1.02] sm:text-7xl">
              Small loans that grow together.
            </h1>
            <p className="max-w-xl text-lg text-muted sm:text-xl">
              Lend $25 to a circle of five small-business owners in Kenya. They repay weekly on M-Pesa, and your share
              comes back to lend again. Piloting now — every person shown is fictional sample data.
            </p>
            <div className="mt-2 flex flex-wrap gap-3">
              <a href="#circles" className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-base font-medium text-accent-ink shadow-card hover:brightness-110">
                <CircleOfFive size={20} className="shrink-0" /> Find a circle
              </a>
              <a href="#how" className="inline-flex items-center rounded-full border border-line px-6 py-3 text-base font-medium text-fg hover:bg-surface">
                How it works ›
              </a>
            </div>
          </div>

          {featured.length > 0 && (
            <aside className="relative lg:pt-6" aria-label="Circles raising now">
              <div className="mb-3 flex items-center gap-2 text-xs uppercase tracking-wider text-muted">
                <span className="h-px flex-1 bg-line sm:max-w-8" aria-hidden="true" />
                Raising now
              </div>
              <ul className="grid gap-3">
                {featured.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/circles/${c.id}`}
                      className="group grid grid-cols-[72px_1fr] items-center gap-4 rounded-card bg-surface p-3 shadow-card transition-transform hover:-translate-y-0.5"
                    >
                      <CircleCover id={c.id} names={c.members.filter((m) => m.loans.length).map((m) => m.name)} size="sm" />
                      <div className="min-w-0">
                        <div className="truncate font-semibold">{c.name}</div>
                        <div className="truncate text-sm text-muted">
                          {c.town} · {c.sector}
                        </div>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </aside>
          )}
        </div>
      </section>

      {/* Live impact — acacia horizon backdrop, display-face clay numbers */}
      <section aria-label="Impact so far" className="relative overflow-hidden rounded-[28px] bg-surface-2/60 px-4 pb-24 pt-10 sm:pb-28">
        <AcaciaHorizon />
        <div className="relative grid grid-cols-2 gap-8 text-center sm:grid-cols-4">
          {[
            [String(funded.length), "people funded"],
            [String(towns.size), towns.size === 1 ? "town" : "towns"],
            [String(lenders.length), "lenders"],
            [pct(stats.onTimeRate), "paid on time"],
          ].map(([v, l], i) => (
            <div key={l}>
              <div className={`num display-num text-5xl sm:text-6xl ${i === 3 ? "text-accent" : "text-clay"}`}>{v}</div>
              <div className="label mt-2">{l}</div>
            </div>
          ))}
        </div>
      </section>

      <HandRule className="opacity-80" />

      {/* How it works */}
      <section id="how" className="grid scroll-mt-24 gap-12">
        <div className="text-center">
          <h2 className="text-4xl font-semibold sm:text-5xl">How it works</h2>
          <p className="mt-2 text-lg text-muted">Three steps, about six months.</p>
        </div>
        <ol className="grid gap-6 sm:grid-cols-3">
          {[
            { Icon: Seed, title: "A circle forms", body: "Five people who already know and trust each other apply together. A local agent checks what each can afford." },
            { Icon: Sprout, title: "You lend $25 or more", body: "Lenders around the world fund the circle. Once it's fully funded, each member gets their own loan on M-Pesa." },
            { Icon: Bloom, title: "They repay, you relend", body: "Members repay weekly at their circle meeting for 26 weeks. Your share comes back to your balance to lend again." },
          ].map(({ Icon, title, body }, i) => (
            <li key={title} className="grid content-start gap-4 rounded-card bg-surface p-7 shadow-card">
              <Icon size={48} />
              <div className="text-sm font-medium text-accent">Step {i + 1}</div>
              <h3 className="text-2xl font-semibold">{title}</h3>
              <p className="text-muted">{body}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Safety net */}
      <section className="grid gap-10 rounded-[28px] bg-surface p-8 shadow-card sm:p-14">
        <div className="max-w-2xl">
          <h2 className="text-4xl font-semibold sm:text-5xl">A safety net with layers.</h2>
          <p className="mt-3 text-lg text-muted">
            When a payment is missed, lenders are the last to feel it. 1.5% of every loan goes into a first-loss reserve, and anyone can see its balance.
          </p>
        </div>
        <ol className="grid gap-3 sm:grid-cols-4" aria-label="Who covers a missed payment, in order">
          {[
            ["The member", "Pays weekly at the circle meeting."],
            ["Their circle", "Can chip in so a member doesn't fall behind."],
            ["The reserve", `${kes(stats.reserveKes)} today, covering unpaid principal.`],
            ["Lenders", "Lose only what the reserve can't cover."],
          ].map(([title, body], i) => (
            <li key={title} className="relative grid content-start gap-1 rounded-2xl bg-surface-2 p-5">
              <span className="num text-sm font-semibold text-accent">{i + 1}</span>
              <span className="text-lg font-semibold">{title}</span>
              <span className="text-sm text-muted">{body}</span>
              {i < 3 && (
                <span className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-xl text-muted sm:block" aria-hidden="true">
                  ›
                </span>
              )}
            </li>
          ))}
        </ol>
        <Link href="/platform" className="text-lg font-medium text-accent hover:underline">
          See every number in the transparency report ›
        </Link>
      </section>

      {/* Circles */}
      <section id="circles" className="grid scroll-mt-24 gap-8">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-4xl font-semibold sm:text-5xl">Circles</h2>
            <p className="mt-1 text-lg text-muted">
              {raising.length} raising now{stats.disbursedUsd ? ` · ${usd0(stats.disbursedUsd)} lent so far` : ""}
            </p>
          </div>
          <nav className="flex gap-1 rounded-full bg-surface p-1 shadow-card" aria-label="Filter circles">
            {FILTERS.map((f) => (
              <Link
                key={f.key}
                href={f.key === "open" ? "/#circles" : `/?show=${f.key}#circles`}
                scroll={false}
                aria-current={show === f.key ? "true" : undefined}
                className={`rounded-full px-3.5 py-1 text-sm font-medium transition-colors ${show === f.key ? "bg-fg text-bg" : "text-muted hover:text-fg"}`}
              >
                {f.label}
              </Link>
            ))}
          </nav>
        </div>
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

      {/* FAQ */}
      <section className="mx-auto grid w-full max-w-3xl gap-8">
        <h2 className="text-center text-4xl font-semibold sm:text-5xl">Straight answers</h2>
        <div className="divide-y divide-line rounded-card bg-surface px-6 shadow-card">
          {FAQ.map(({ q, a }) => (
            <details key={q} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-medium [&::-webkit-details-marker]:hidden">
                {q}
                <span className="text-2xl font-light text-muted transition-transform group-open:rotate-45" aria-hidden="true">
                  +
                </span>
              </summary>
              <p className="mt-3 text-muted">{a}</p>
            </details>
          ))}
        </div>
      </section>

      <HandRule className="opacity-80" />

      {/* Closing */}
      <section className="grid justify-items-center gap-5 pb-8 text-center">
        <h2 className="max-w-2xl text-4xl font-semibold sm:text-5xl">$25 is enough to start something.</h2>
        <a href="#circles" className="rounded-full bg-accent px-6 py-3 text-lg font-medium text-accent-ink hover:brightness-110">
          Find a circle
        </a>
      </section>
    </div>
  );
}
