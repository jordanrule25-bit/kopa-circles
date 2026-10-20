import { installmentKes } from "@kopa/core";
import { prisma, type Prisma } from "@kopa/db";

export const circleInclude = {
  members: { orderBy: { id: "asc" }, include: { loans: { include: { installments: { orderBy: { n: "asc" } } } } } },
  shares: true,
  agent: { include: { partner: true } },
} satisfies Prisma.CircleInclude;

export type CircleFull = Prisma.CircleGetPayload<{ include: typeof circleInclude }>;

export function loadCircle(id: string) {
  return prisma.circle.findUnique({ where: { id }, include: circleInclude });
}

export function loadCircles(where: Prisma.CircleWhereInput) {
  return prisma.circle.findMany({ where, orderBy: { createdAt: "desc" }, include: circleInclude });
}

export type MemberState = "ok" | "late" | "pending";

/** Everything a card or page needs, derived from the loaded rows. No loan math here beyond calling core. */
export function summarize(c: CircleFull, today: Date) {
  const loans = c.members.flatMap((m) => m.loans);
  const targetCents = loans.reduce((t, l) => t + l.listedUsdCents, 0);
  const fundedCents = c.shares.reduce((t, s) => t + s.amountCents, 0);
  const principalKes = loans.reduce((t, l) => t + l.principalKesCents, 0);
  const totalDueKes = loans.reduce((t, l) => t + l.installments.reduce((u, i) => u + i.amountKesCents, 0), 0);
  const paidKes = loans.reduce((t, l) => t + l.installments.reduce((u, i) => u + i.paidKesCents, 0), 0);
  const weeklyKes = loans.filter((l) => l.status === "REPAYING").reduce((t, l) => t + installmentKes(l.principalKesCents, l.feeBps, l.weeks), 0);

  const members = c.members.map((m) => {
    const loan = m.loans[0];
    const paid = loan?.installments.reduce((t, i) => t + i.paidKesCents, 0) ?? 0;
    const covered = loan?.installments.reduce((t, i) => t + i.coveredByCircleKesCents, 0) ?? 0;
    const arrears = loan?.installments.filter((i) => i.dueOn <= today).reduce((t, i) => t + Math.max(0, i.amountKesCents - i.paidKesCents), 0) ?? 0;
    const state: MemberState = !loan || loan.status === "LISTED" || loan.status === "FUNDED" ? "pending" : arrears > 0 ? "late" : "ok";
    return { ...m, loan, paidKes: paid, coveredKes: covered, arrearsKes: arrears, state };
  });

  const disbursedAt = loans.find((l) => l.disbursedAt)?.disbursedAt ?? null;
  const week = disbursedAt ? Math.min(26, Math.floor((today.getTime() - disbursedAt.getTime()) / (7 * 86_400_000))) : 0;
  const late = members.filter((m) => m.state === "late").length;

  return { targetCents, fundedCents, principalKes, totalDueKes, paidKes, weeklyKes, members, week, late, disbursedAt };
}
export type CircleSummary = ReturnType<typeof summarize>;

export function statusChip(c: CircleFull, s: CircleSummary): { label: string; tone: "neutral" | "good" | "sun" | "bad" } {
  if (c.status === "RAISING") return { label: "Raising", tone: "sun" };
  if (c.status === "COMPLETE") return { label: "Complete", tone: "good" };
  if (c.status === "REPAYING") return s.late ? { label: `${s.late} late`, tone: "bad" } : { label: "On schedule", tone: "good" };
  return { label: c.status === "SUBMITTED" ? "Waiting for approval" : c.status.charAt(0) + c.status.slice(1).toLowerCase(), tone: "neutral" };
}
