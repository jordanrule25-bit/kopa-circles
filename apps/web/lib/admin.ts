import { portfolioStats, prisma } from "@kopa/db";
import { loadCircles, summarize } from "./circles";
import { currentFx } from "./fx";

const DAY = 86_400_000;

/** Monday 00:00 UTC of the week containing `d`. */
export function weekStart(d: Date) {
  const midnight = Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
  const dow = (new Date(midnight).getUTCDay() + 6) % 7; // Monday = 0
  return new Date(midnight - dow * DAY);
}

export type MeetingStatus = "recorded" | "partial" | "to-record" | "upcoming";

/** Everything the admin's Today page shows, from stored data only. */
export async function adminOverview(today: Date) {
  const fx = currentFx();
  const start = weekStart(today);
  const end = new Date(start.getTime() + 7 * DAY);

  const [submittedCount, raising, repaying, stats] = await Promise.all([
    prisma.circle.count({ where: { status: "SUBMITTED" } }),
    loadCircles({ status: "RAISING" }),
    loadCircles({ status: "REPAYING" }),
    portfolioStats(prisma, today, fx),
  ]);

  const readyToDisburse = raising.filter((c) => {
    const s = summarize(c, today);
    return s.targetCents > 0 && s.fundedCents >= s.targetCents;
  });

  const meetings = repaying
    .map((c) => {
      const due = c.members
        .flatMap((m) => m.loans)
        .filter((l) => l.status === "REPAYING")
        .flatMap((l) => l.installments.filter((i) => i.dueOn >= start && i.dueOn < end));
      if (due.length === 0) return null;
      const dueKes = due.reduce((t, i) => t + i.amountKesCents, 0);
      const paidKes = due.reduce((t, i) => t + Math.min(i.paidKesCents, i.amountKesCents), 0);
      const on = new Date(Math.min(...due.map((i) => i.dueOn.getTime())));
      const status: MeetingStatus = paidKes >= dueKes ? "recorded" : paidKes > 0 ? "partial" : on > today ? "upcoming" : "to-record";
      return { circle: c, on, dueKes, paidKes, status };
    })
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .sort((a, b) => a.on.getTime() - b.on.getTime());

  const behind = repaying
    .flatMap((c) =>
      summarize(c, today)
        .members.filter((m) => m.arrearsKes > 0 && m.loan)
        .map((m) => {
          const oldest = m.loan!.installments.find((i) => i.paidKesCents < i.amountKesCents && i.dueOn <= today)!;
          return { circle: c, member: m, arrearsKes: m.arrearsKes, daysLate: Math.floor((today.getTime() - oldest.dueOn.getTime()) / DAY) };
        }),
    )
    .sort((a, b) => b.daysLate - a.daysLate);

  const pastTerm = repaying.flatMap((c) =>
    c.members
      .flatMap((m) => m.loans.map((l) => ({ m, l })))
      .filter(({ l }) => l.status === "REPAYING" && l.installments.length > 0 && l.installments[l.installments.length - 1]!.dueOn < today)
      .map(({ m, l }) => ({ circle: c, member: m, loan: l })),
  );

  return {
    week: { start, end },
    submittedCount,
    raisingCount: raising.length,
    readyToDisburse,
    meetings,
    behind,
    pastTerm,
    stats,
    reserveCoverage: stats.outstandingKes ? stats.reserveKes / stats.outstandingKes : 1,
  };
}
