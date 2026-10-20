import { aprFromFlatFee, FEE_BPS, WEEKS } from "@kopa/core";
import { reserveBalanceKes, prisma } from "@kopa/db";
import Link from "next/link";
import { CircleCard } from "@/components/circle-card";
import { Empty } from "@/components/ui";
import { loadCircles, summarize } from "@/lib/circles";
import { kes, pct } from "@/lib/format";
import { currentUser } from "@/lib/session";

const FILTERS = [
  { key: "open", label: "Raising now" },
  { key: "repaying", label: "Repaying" },
  { key: "all", label: "All" },
] as const;

export default async function Lend({ searchParams }: { searchParams: Promise<{ show?: string }> }) {
  const show = (await searchParams).show ?? "open";
  const user = await currentUser();
  const today = new Date();
  const statuses = show === "open" ? ["RAISING"] : show === "repaying" ? ["REPAYING"] : ["RAISING", "REPAYING", "COMPLETE"];
  const [circles, reserve] = await Promise.all([
    loadCircles({ status: { in: statuses as ("RAISING" | "REPAYING" | "COMPLETE")[] } }),
    reserveBalanceKes(prisma),
  ]);
  const lenderId = user?.lender?.userId;

  return (
    <>
      <section className="mx-auto grid max-w-3xl justify-items-center gap-4 py-6 text-center sm:py-10">
        <h1 className="text-4xl font-semibold leading-[1.08] sm:text-6xl">Lend $25 to a circle of five small businesses in Kenya</h1>
        <p className="max-w-2xl text-lg text-muted sm:text-xl">
          Each member gets their own loan, paid to their M-Pesa wallet and repaid weekly at the circle meeting. You get your principal back. You
          never earn interest.
        </p>
        <dl className="mt-4 grid w-full grid-cols-1 gap-6 sm:grid-cols-3">
          <div>
            <dt className="label">Borrowers pay</dt>
            <dd className="num text-xl font-semibold">7% flat · {pct(aprFromFlatFee(FEE_BPS, WEEKS))} APR</dd>
          </div>
          <div>
            <dt className="label">If a payment is missed</dt>
            <dd className="text-xl font-semibold">Circle, reserve, then lenders</dd>
          </div>
          <div>
            <dt className="label">First-loss reserve</dt>
            <dd className="num text-xl font-semibold">
              <Link href="/platform" className="hover:underline">
                {kes(reserve)} ›
              </Link>
            </dd>
          </div>
        </dl>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-2xl font-semibold">Circles</h2>
        <nav className="flex gap-1 rounded-full bg-surface p-1 shadow-card" aria-label="Filter circles">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "open" ? "/" : `/?show=${f.key}`}
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
    </>
  );
}
