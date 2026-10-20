import { prisma } from "@kopa/db";
import { weekStart } from "./admin";

const DAY = 86_400_000;

export type WeekRow = { week: Date; memberKes: number; circleKes: number; unpaidKes: number; dueKes: number };
export type ReservePoint = { at: Date; balanceKes: number };

/** Installments grouped by the calendar week they fell due, split by who paid. */
export async function weeklyCollections(today: Date): Promise<WeekRow[]> {
  const inst = await prisma.installment.findMany({
    where: { dueOn: { lte: today }, loan: { status: { in: ["REPAYING", "CLOSED", "DEFAULTED"] } } },
    select: { dueOn: true, amountKesCents: true, paidKesCents: true, coveredByCircleKesCents: true },
  });
  const byWeek = new Map<number, WeekRow>();
  for (const i of inst) {
    const w = weekStart(i.dueOn);
    const row = byWeek.get(w.getTime()) ?? { week: w, memberKes: 0, circleKes: 0, unpaidKes: 0, dueKes: 0 };
    const paid = Math.min(i.paidKesCents, i.amountKesCents);
    row.circleKes += Math.min(i.coveredByCircleKesCents, paid);
    row.memberKes += paid - Math.min(i.coveredByCircleKesCents, paid);
    row.unpaidKes += i.amountKesCents - paid;
    row.dueKes += i.amountKesCents;
    byWeek.set(w.getTime(), row);
  }
  // Fill empty weeks so the time axis is continuous.
  const rows = [...byWeek.values()].sort((a, b) => a.week.getTime() - b.week.getTime());
  if (rows.length === 0) return rows;
  const out: WeekRow[] = [];
  for (let t = rows[0]!.week.getTime(); t <= rows[rows.length - 1]!.week.getTime(); t += 7 * DAY) {
    out.push(byWeek.get(t) ?? { week: new Date(t), memberKes: 0, circleKes: 0, unpaidKes: 0, dueKes: 0 });
  }
  return out;
}

/** The reserve's balance after each day it changed. */
export async function reserveHistory(): Promise<ReservePoint[]> {
  const events = await prisma.reserveEvent.findMany({ orderBy: { at: "asc" }, select: { at: true, kind: true, amountKesCents: true } });
  const points: ReservePoint[] = [];
  let balance = 0;
  for (const e of events) {
    balance += e.kind === "IN" ? e.amountKesCents : -e.amountKesCents;
    const day = new Date(Date.UTC(e.at.getUTCFullYear(), e.at.getUTCMonth(), e.at.getUTCDate()));
    const last = points[points.length - 1];
    if (last && last.at.getTime() === day.getTime()) last.balanceKes = balance;
    else points.push({ at: day, balanceKes: balance });
  }
  return points;
}
