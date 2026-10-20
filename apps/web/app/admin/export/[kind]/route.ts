import { prisma } from "@kopa/db";
import { requireAdmin } from "@/lib/session";

// CSV exports for the partner and for grant reporting. Amounts are in KES
// (whole shillings and cents) so a spreadsheet can sum them directly.

const cell = (v: unknown) => {
  const s = v == null ? "" : v instanceof Date ? v.toISOString().slice(0, 10) : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};
const csv = (header: string[], rows: unknown[][]) => [header, ...rows].map((r) => r.map(cell).join(",")).join("\n") + "\n";
const ksh = (cents: number) => (cents / 100).toFixed(2);

export async function GET(_req: Request, { params }: { params: Promise<{ kind: string }> }) {
  await requireAdmin();
  const { kind } = await params;
  let body: string;

  if (kind === "loans") {
    const loans = await prisma.loan.findMany({ include: { member: true, circle: true, installments: true }, orderBy: [{ circleId: "asc" }, { id: "asc" }] });
    body = csv(
      ["loan_id", "circle", "town", "member", "business", "status", "principal_kes", "listed_usd", "fee_bps", "weeks", "disbursed_on", "closed_on", "paid_kes", "covered_by_circle_kes", "outstanding_kes"],
      loans.map((l) => {
        const paid = l.installments.reduce((t, i) => t + i.paidKesCents, 0);
        const due = l.installments.reduce((t, i) => t + i.amountKesCents, 0);
        return [
          l.id, l.circle.name, l.circle.town, l.member.name, l.member.business, l.status, ksh(l.principalKesCents), (l.listedUsdCents / 100).toFixed(2),
          l.feeBps, l.weeks, l.disbursedAt, l.closedAt, ksh(paid), ksh(l.installments.reduce((t, i) => t + i.coveredByCircleKesCents, 0)), ksh(Math.max(0, due - paid)),
        ];
      }),
    );
  } else if (kind === "installments") {
    const inst = await prisma.installment.findMany({ include: { loan: { include: { member: true, circle: true } } }, orderBy: [{ loanId: "asc" }, { n: "asc" }] });
    body = csv(
      ["loan_id", "circle", "member", "n", "due_on", "amount_kes", "principal_kes", "paid_kes", "paid_on", "covered_by_circle_kes"],
      inst.map((i) => [i.loanId, i.loan.circle.name, i.loan.member.name, i.n, i.dueOn, ksh(i.amountKesCents), ksh(i.principalKesCents), ksh(i.paidKesCents), i.paidAt, ksh(i.coveredByCircleKesCents)]),
    );
  } else {
    return new Response("Not found", { status: 404 });
  }

  return new Response(body, {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": `attachment; filename="kopa-${kind}-${new Date().toISOString().slice(0, 10)}.csv"`,
    },
  });
}
