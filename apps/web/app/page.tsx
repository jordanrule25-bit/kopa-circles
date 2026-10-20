import { aprFromFlatFee, FEE_BPS, WEEKS } from "@kopa/core";
import { reserveBalanceKes, prisma } from "@kopa/db";
import Link from "next/link";
import { CircleCard } from "@/components/circle-card";
import { Empty, Panel } from "@/components/ui";
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
      <Panel className="sm:grid-cols-[1.4fr_1fr] sm:items-center">
        <div className="grid gap-2">
          <h1 className="text-[1.6rem] font-semibold">Lend $25 to a circle of five small businesses in Kenya</h1>
          <p className="text-muted">
            Each member gets their own loan, paid out to their M-Pesa wallet and repaid weekly at the circle meeting. You get your principal back.
            You never earn interest.
          </p>
        </div>
        <ul className="grid gap-1.5 text-sm">
          <li>
            <span className="label">Borrowers pay</span> <span className="num">7% flat · {pct(aprFromFlatFee(FEE_BPS, WEEKS))} APR</span>
          </li>
          <li>
            <span className="label">If a payment is missed</span> circle covers, then the reserve, then lenders
          </li>
          <li>
            <span className="label">First-loss reserve</span> <span className="num">{kes(reserve)}</span>{" "}
            <Link href="/platform" className="text-accent underline underline-offset-2">
              details
            </Link>
          </li>
        </ul>
      </Panel>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[1.45rem] font-semibold">Circles</h2>
        <nav className="flex gap-1.5" aria-label="Filter circles">
          {FILTERS.map((f) => (
            <Link
              key={f.key}
              href={f.key === "open" ? "/" : `/?show=${f.key}`}
              aria-current={show === f.key ? "true" : undefined}
              className={`rounded-full border px-3 py-1 text-sm font-semibold ${show === f.key ? "border-accent bg-accent-soft" : "border-line bg-surface hover:border-accent"}`}
            >
              {f.label}
            </Link>
          ))}
        </nav>
      </div>

      {circles.length === 0 ? (
        <Empty title="Nothing here right now">Every listed circle is funded. New circles list as agents submit them.</Empty>
      ) : (
        <div className="grid gap-4 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
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
      <p className="text-xs text-muted">All circles and people shown are fictional sample data during the pilot build.</p>
    </>
  );
}
