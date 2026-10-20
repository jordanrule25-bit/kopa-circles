import { prisma, reserveBalanceKes } from "@kopa/db";
import { ButtonLink, PageHead, Panel, Stat, Stats } from "@/components/ui";
import { date, kes } from "@/lib/format";
import { requireAdmin } from "@/lib/session";

export const metadata = { title: "Reserve" };

export default async function Reserve() {
  await requireAdmin();
  const [balance, events, totals] = await Promise.all([
    reserveBalanceKes(prisma),
    prisma.reserveEvent.findMany({ orderBy: { at: "desc" }, take: 100, include: { reserve: false } }),
    prisma.reserveEvent.groupBy({ by: ["kind"], _sum: { amountKesCents: true }, _count: true }),
  ]);
  const loans = await prisma.loan.findMany({
    where: { id: { in: events.flatMap((e) => (e.loanId ? [e.loanId] : [])) } },
    include: { member: true, circle: true },
  });
  const loan = (id: string | null) => loans.find((l) => l.id === id);
  const t = (k: "IN" | "OUT") => totals.find((x) => x.kind === k);

  return (
    <>
      <PageHead
        title="First-loss reserve"
        sub="Funded by 1.5% of every disbursement. Covers unpaid principal before lenders lose anything. Lenders see this balance."
        action={
          <div className="flex gap-2">
            <ButtonLink href="/admin/export/loans" size="sm" prefetch={false}>
              Loans CSV
            </ButtonLink>
            <ButtonLink href="/admin/export/installments" size="sm" prefetch={false}>
              Installments CSV
            </ButtonLink>
          </div>
        }
      />
      <Stats>
        <Stat label="Balance" value={kes(balance)} testId="reserve-balance" />
        <Stat label="Paid in" value={kes(t("IN")?._sum.amountKesCents ?? 0)} sub={`${t("IN")?._count ?? 0} contributions`} />
        <Stat label="Paid out" value={kes(t("OUT")?._sum.amountKesCents ?? 0)} sub={`${t("OUT")?._count ?? 0} defaults covered`} />
      </Stats>
      <Panel>
        <h2 className="text-lg font-semibold">History</h2>
        <div className="overflow-x-auto">
          <table className="data">
            <thead>
              <tr>
                <th>Date</th>
                <th>What</th>
                <th className="r">In</th>
                <th className="r">Out</th>
              </tr>
            </thead>
            <tbody>
              {events.map((e) => {
                const l = loan(e.loanId);
                return (
                  <tr key={e.id}>
                    <td className="num">{date(e.at)}</td>
                    <td>
                      {e.note ?? (e.kind === "IN" ? "1.5% of disbursement" : "Covered unpaid principal")}
                      {l && (
                        <span className="text-muted">
                          {" "}
                          · {l.member.name}, {l.circle.name}
                        </span>
                      )}
                    </td>
                    <td className="r num">{e.kind === "IN" ? kes(e.amountKesCents) : ""}</td>
                    <td className="r num">{e.kind === "OUT" ? kes(e.amountKesCents) : ""}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </>
  );
}
