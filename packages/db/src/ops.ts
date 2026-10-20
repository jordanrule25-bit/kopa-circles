// Every state change in a loan's life, as transactions over the ledger.
// The math is in @kopa/core; this module only loads state, calls core and
// persists the resulting events plus the projections (installment paid
// amounts, share repaid/lost, lender balance) that the screens read.
import {
  allocateToLenders,
  applyPayment,
  closeLoan,
  kesToUsdCents,
  reserveContributionKes,
  scheduleFor,
  type Fx,
  type InstallmentState,
  type LedgerEventDraft,
  type LoanRef,
} from "@kopa/core";
import { Prisma, type PrismaClient } from "@prisma/client";
import type { PaymentRail } from "./rail";

type Tx = Prisma.TransactionClient;

/** A rule was broken; the message is safe to show to the user. */
export class OpError extends Error {}

/** Smallest stake a lender can take, unless less than that is left to fund. */
export const MIN_STAKE_CENTS = 2_500;

const toRow = (e: LedgerEventDraft, at: Date): Prisma.LedgerEventCreateManyInput => ({
  at,
  kind: e.kind,
  loanId: e.loanId ?? null,
  circleId: e.circleId ?? null,
  lenderId: e.lenderId ?? null,
  amountMinor: e.amountMinor,
  currency: e.currency,
  meta: e.meta as Prisma.InputJsonValue,
});

async function lockCircle(tx: Tx, circleId: string) {
  await tx.$queryRaw`SELECT id FROM "Circle" WHERE id = ${circleId} FOR UPDATE`;
  const circle = await tx.circle.findUnique({ where: { id: circleId } });
  if (!circle) throw new OpError("Circle not found.");
  return circle;
}

// ---------- balances (derived from events) ----------

export async function reserveBalanceKes(db: Tx | PrismaClient): Promise<number> {
  const rows = await db.reserveEvent.groupBy({ by: ["kind"], _sum: { amountKesCents: true } });
  const sum = (k: "IN" | "OUT") => rows.find((r) => r.kind === k)?._sum.amountKesCents ?? 0;
  return sum("IN") - sum("OUT");
}

export async function lenderBalanceCents(db: Tx | PrismaClient, lenderId: string): Promise<number> {
  const rows = await db.ledgerEvent.groupBy({
    by: ["kind"],
    where: { lenderId, currency: "USD", kind: { in: ["LENDER_DEPOSIT", "LENDER_FUNDED", "LENDER_PAYOUT"] } },
    _sum: { amountMinor: true },
  });
  const sum = (k: string) => rows.find((r) => r.kind === k)?._sum.amountMinor ?? 0;
  return sum("LENDER_DEPOSIT") + sum("LENDER_PAYOUT") - sum("LENDER_FUNDED");
}

export async function circleFunding(db: Tx | PrismaClient, circleId: string) {
  const [loans, shares] = await Promise.all([
    db.loan.aggregate({ where: { circleId }, _sum: { listedUsdCents: true } }),
    db.lenderShare.aggregate({ where: { circleId }, _sum: { amountCents: true } }),
  ]);
  const targetCents = loans._sum.listedUsdCents ?? 0;
  const fundedCents = shares._sum.amountCents ?? 0;
  return { targetCents, fundedCents, remainingCents: Math.max(0, targetCents - fundedCents) };
}

// ---------- listing ----------

export async function approveCircle(db: PrismaClient, circleId: string, at = new Date()) {
  const { count } = await db.circle.updateMany({
    where: { id: circleId, status: "SUBMITTED" },
    data: { status: "RAISING", approvedAt: at },
  });
  if (count !== 1) throw new OpError("Only a circle waiting for approval can be approved.");
}

// ---------- lending ----------

export interface LendInput {
  lenderId: string;
  circleId: string;
  amountCents: number;
  tipCents: number;
  fx: Fx;
  at?: Date;
}

/**
 * A lender funds part of a raising circle. Uses their balance first; any
 * shortfall is charged by checkout (mocked until Stripe lands in M2). Tips are
 * always charged by checkout and never come out of the balance.
 */
export async function lend(db: PrismaClient, input: LendInput) {
  const { lenderId, circleId, amountCents, tipCents, fx } = input;
  const at = input.at ?? new Date();
  if (!Number.isSafeInteger(amountCents) || amountCents <= 0) throw new OpError("Choose an amount to lend.");
  if (!Number.isSafeInteger(tipCents) || tipCents < 0) throw new OpError("Tip must be zero or more.");

  return db.$transaction(async (tx) => {
    const circle = await lockCircle(tx, circleId);
    if (circle.status !== "RAISING") throw new OpError("This circle isn't raising money right now.");
    const { remainingCents } = await circleFunding(tx, circleId);
    if (remainingCents === 0) throw new OpError("This circle is already fully funded.");
    if (amountCents > remainingCents) throw new OpError(`Only $${(remainingCents / 100).toFixed(2)} is left to fund.`);
    if (amountCents < Math.min(MIN_STAKE_CENTS, remainingCents)) throw new OpError("The smallest loan share is $25.");

    const balance = await lenderBalanceCents(tx, lenderId);
    const chargedCents = Math.max(0, amountCents - balance);
    const events: LedgerEventDraft[] = [];
    if (chargedCents > 0) {
      events.push({ kind: "LENDER_DEPOSIT", lenderId, amountMinor: chargedCents, currency: "USD", meta: { source: "MOCK_CHECKOUT" } });
    }
    events.push({ kind: "LENDER_FUNDED", lenderId, circleId, amountMinor: amountCents, currency: "USD", meta: { fxRate: fx.kesPerUsd } });
    if (tipCents > 0) {
      events.push({ kind: "TIP", lenderId, circleId, amountMinor: tipCents, currency: "USD", meta: { source: "MOCK_CHECKOUT" } });
    }
    await tx.ledgerEvent.createMany({ data: events.map((e) => toRow(e, at)) });
    await tx.lenderShare.create({
      data: { lenderId, circleId, amountCents, fxRateAtFunding: new Prisma.Decimal(fx.kesPerUsd), createdAt: at },
    });
    await tx.lender.update({ where: { userId: lenderId }, data: { balanceCents: balance + chargedCents - amountCents } });

    const after = await circleFunding(tx, circleId);
    return { chargedCents: chargedCents + tipCents, fullyFunded: after.remainingCents === 0 };
  });
}

// ---------- disbursal ----------

export async function disburseCircle(
  db: PrismaClient,
  opts: { circleId: string; on: Date; rail: PaymentRail; allowUnfunded?: boolean },
) {
  const { circleId, on, rail } = opts;
  return db.$transaction(async (tx) => {
    const circle = await lockCircle(tx, circleId);
    if (circle.status !== "RAISING") throw new OpError("Only an approved, raising circle can be disbursed.");
    const funding = await circleFunding(tx, circleId);
    if (funding.remainingCents > 0 && !opts.allowUnfunded) {
      throw new OpError("This circle isn't fully funded. Confirm that the rest is funded outside the platform.");
    }
    const loans = await tx.loan.findMany({ where: { circleId, status: { in: ["LISTED", "FUNDED"] } } });
    if (loans.length === 0) throw new OpError("This circle has no listed loans.");

    let totalKes = 0;
    for (const loan of loans) {
      // M1: MockRail. M3 must move the rail call out of the transaction (idempotent, retried).
      const { reference } = await rail.disburse({ loanId: loan.id, memberId: loan.memberId, amountKesCents: loan.principalKesCents });
      const reserveIn = reserveContributionKes(loan.principalKesCents);
      const base = { loanId: loan.id, circleId, currency: "KES" as const };
      await tx.ledgerEvent.createMany({
        data: [
          toRow({ ...base, kind: "DISBURSEMENT", amountMinor: loan.principalKesCents, meta: { rail: rail.name, reference } }, on),
          toRow({ ...base, kind: "RESERVE_IN", amountMinor: reserveIn, meta: {} }, on),
        ],
      });
      await tx.reserveEvent.create({ data: { kind: "IN", amountKesCents: reserveIn, loanId: loan.id, at: on } });
      await tx.installment.createMany({
        data: scheduleFor(loan, on).map((i) => ({ loanId: loan.id, ...i })),
      });
      await tx.loan.update({ where: { id: loan.id }, data: { status: "REPAYING", disbursedAt: on } });
      totalKes += loan.principalKesCents;
    }
    await tx.circle.update({ where: { id: circleId }, data: { status: "REPAYING" } });
    return { loans: loans.length, totalKes };
  });
}

// ---------- repayments ----------

async function loadLoanState(tx: Tx, loanId: string) {
  const loan = await tx.loan.findUnique({ where: { id: loanId }, include: { installments: { orderBy: { n: "asc" } } } });
  if (!loan) throw new OpError("Loan not found.");
  const ref: LoanRef = { id: loan.id, circleId: loan.circleId, principalKesCents: loan.principalKesCents, feeBps: loan.feeBps, weeks: loan.weeks };
  const state: InstallmentState[] = loan.installments.map((i) => ({
    n: i.n,
    dueOn: i.dueOn,
    amountKesCents: i.amountKesCents,
    principalKesCents: i.principalKesCents,
    paidKesCents: i.paidKesCents,
    coveredByCircleKesCents: i.coveredByCircleKesCents,
  }));
  return { loan, ref, state };
}

async function saveInstallments(tx: Tx, loanId: string, before: InstallmentState[], after: InstallmentState[], at: Date) {
  for (const a of after) {
    const b = before.find((x) => x.n === a.n)!;
    if (a.paidKesCents === b.paidKesCents) continue;
    const nowPaid = a.paidKesCents >= a.amountKesCents && b.paidKesCents < b.amountKesCents;
    await tx.installment.update({
      where: { loanId_n: { loanId, n: a.n } },
      data: {
        paidKesCents: a.paidKesCents,
        coveredByCircleKesCents: a.coveredByCircleKesCents,
        ...(nowPaid ? { paidAt: at } : {}),
      },
    });
  }
}

/**
 * Passes principal to the circle's lenders. Stakes are on the whole circle, so
 * lenders get the funded fraction of each shilling of principal; the unfunded
 * fraction (pilot money raised outside the platform) stays with the partner.
 */
async function settleLenders(
  tx: Tx,
  opts: { circleId: string; principalKesCents: number; fx: Fx; at: Date; kind: "LENDER_PAYOUT" | "LENDER_LOSS"; loanId?: string },
) {
  const { circleId, principalKesCents, fx, at, kind } = opts;
  if (principalKesCents <= 0) return;
  const shares = await tx.lenderShare.findMany({ where: { circleId }, orderBy: { id: "asc" } });
  if (shares.length === 0) return;

  const { targetCents, fundedCents } = await circleFunding(tx, circleId);
  if (targetCents === 0) return;
  const lendersKes = Math.floor((principalKesCents * Math.min(fundedCents, targetCents)) / targetCents);

  // One stake per share row so each row's repaid/lost stays exact.
  const payouts = allocateToLenders(
    shares.map((s) => ({ lenderId: s.id, amountCents: s.amountCents })),
    lendersKes,
    fx,
  );
  for (const p of payouts) {
    if (p.amountCents === 0) continue;
    const share = shares.find((s) => s.id === p.lenderId)!;
    await tx.ledgerEvent.create({
      data: toRow(
        {
          kind,
          lenderId: share.lenderId,
          circleId,
          ...(opts.loanId ? { loanId: opts.loanId } : {}),
          amountMinor: p.amountCents,
          currency: "USD",
          meta: { shareId: share.id, fxRate: fx.kesPerUsd },
        },
        at,
      ),
    });
    if (kind === "LENDER_PAYOUT") {
      await tx.lenderShare.update({ where: { id: share.id }, data: { repaidCents: { increment: p.amountCents } } });
      await tx.lender.update({ where: { userId: share.lenderId }, data: { balanceCents: { increment: p.amountCents } } });
    } else {
      await tx.lenderShare.update({ where: { id: share.id }, data: { lostCents: { increment: p.amountCents } } });
    }
  }
}

async function completeCircleIfDone(tx: Tx, circleId: string) {
  const open = await tx.loan.count({ where: { circleId, status: { notIn: ["CLOSED", "DEFAULTED"] } } });
  if (open === 0) await tx.circle.update({ where: { id: circleId }, data: { status: "COMPLETE" } });
}

export interface MeetingEntry {
  loanId: string;
  /** Paid by the member at the meeting. */
  memberKesCents: number;
  /** Paid by the rest of the circle on the member's behalf. */
  circleKesCents: number;
}

/** Records one weekly circle meeting: each member's payment and any cover by the circle. */
export async function recordMeeting(db: PrismaClient, opts: { circleId: string; on: Date; fx: Fx; entries: MeetingEntry[] }) {
  const { circleId, on, fx } = opts;
  const entries = opts.entries.filter((e) => e.memberKesCents > 0 || e.circleKesCents > 0);
  if (entries.length === 0) throw new OpError("Enter at least one payment.");
  for (const e of entries) {
    if (![e.memberKesCents, e.circleKesCents].every((v) => Number.isSafeInteger(v) && v >= 0)) {
      throw new OpError("Payments must be whole amounts of zero or more.");
    }
  }

  return db.$transaction(async (tx) => {
    const circle = await lockCircle(tx, circleId);
    if (circle.status !== "REPAYING") throw new OpError("Payments can only be recorded for a repaying circle.");

    let principalTotal = 0;
    let collected = 0;
    for (const entry of entries) {
      const { loan, ref, state } = await loadLoanState(tx, entry.loanId);
      if (loan.circleId !== circleId) throw new OpError("That loan isn't in this circle.");
      if (loan.status !== "REPAYING") throw new OpError("That loan isn't repaying.");

      let next = state;
      const events: LedgerEventDraft[] = [];
      for (const [amount, payer] of [
        [entry.memberKesCents, "MEMBER"],
        [entry.circleKesCents, "CIRCLE"],
      ] as const) {
        if (amount === 0) continue;
        const r = applyPayment(ref, next, amount, payer);
        next = r.installments;
        events.push(...r.events);
      }
      await tx.ledgerEvent.createMany({ data: events.map((e) => toRow(e, on)) });
      await saveInstallments(tx, loan.id, state, next, on);
      principalTotal += events.reduce((t, e) => t + ((e.meta.principalKesCents as number | undefined) ?? 0), 0);
      collected += entry.memberKesCents + entry.circleKesCents;

      if (next.every((i) => i.paidKesCents >= i.amountKesCents)) {
        const closed = closeLoan(ref, next, 0);
        await tx.ledgerEvent.createMany({ data: closed.events.map((e) => toRow(e, on)) });
        await tx.loan.update({ where: { id: loan.id }, data: { status: "CLOSED", closedAt: on } });
      }
    }

    await settleLenders(tx, { circleId, principalKesCents: principalTotal, fx, at: on, kind: "LENDER_PAYOUT" });
    await completeCircleIfDone(tx, circleId);
    return { collectedKes: collected, principalKes: principalTotal };
  });
}

/**
 * Closes a loan that won't be repaid in full. The first-loss reserve covers
 * unpaid principal; anything beyond it is a lender loss.
 */
export async function closeDefaultedLoan(db: PrismaClient, opts: { loanId: string; on: Date; fx: Fx; note?: string }) {
  const { on, fx } = opts;
  return db.$transaction(async (tx) => {
    const { loan, ref, state } = await loadLoanState(tx, opts.loanId);
    await lockCircle(tx, loan.circleId);
    if (loan.status !== "REPAYING") throw new OpError("Only a repaying loan can be closed.");
    if (state.every((i) => i.paidKesCents >= i.amountKesCents)) throw new OpError("This loan is fully repaid.");

    const reserve = await reserveBalanceKes(tx);
    const closed = closeLoan(ref, state, reserve);
    await tx.ledgerEvent.createMany({
      data: closed.events.map((e) => toRow({ ...e, meta: { ...e.meta, ...(opts.note ? { note: opts.note } : {}) } }, on)),
    });
    if (closed.reserveOut > 0) {
      await tx.reserveEvent.create({ data: { kind: "OUT", amountKesCents: closed.reserveOut, loanId: loan.id, at: on, note: opts.note ?? null } });
    }
    await settleLenders(tx, { circleId: loan.circleId, principalKesCents: closed.reserveOut, fx, at: on, kind: "LENDER_PAYOUT", loanId: loan.id });
    await settleLenders(tx, { circleId: loan.circleId, principalKesCents: closed.lenderLoss, fx, at: on, kind: "LENDER_LOSS", loanId: loan.id });
    await tx.loan.update({ where: { id: loan.id }, data: { status: "DEFAULTED", closedAt: on } });
    await completeCircleIfDone(tx, loan.circleId);
    return closed;
  });
}

// ---------- reporting ----------

const DAY_MS = 86_400_000;

/** Portfolio health as of a date. PAR30: share of outstanding principal on loans with an installment 30+ days late. */
export async function portfolioStats(db: PrismaClient, asOf: Date, fx: Fx) {
  const loans = await db.loan.findMany({
    where: { status: { in: ["REPAYING", "CLOSED", "DEFAULTED"] } },
    include: { installments: true },
  });
  let outstanding = 0;
  let atRisk30 = 0;
  let due = 0;
  let paidOnTime = 0;
  let coveredByCircle = 0;
  let disbursedKes = 0;
  for (const loan of loans) {
    disbursedKes += loan.principalKesCents;
    if (loan.status !== "REPAYING") continue;
    const principalLeft = loan.installments.reduce(
      (t, i) => t + i.principalKesCents - (i.paidKesCents >= i.amountKesCents ? i.principalKesCents : Math.floor((i.paidKesCents * i.principalKesCents) / i.amountKesCents)),
      0,
    );
    outstanding += principalLeft;
    const late30 = loan.installments.some((i) => i.paidKesCents < i.amountKesCents && asOf.getTime() - i.dueOn.getTime() > 30 * DAY_MS);
    if (late30) atRisk30 += principalLeft;
    for (const i of loan.installments) {
      if (i.dueOn > asOf) continue;
      due += 1;
      if (i.paidKesCents >= i.amountKesCents && i.paidAt && i.paidAt <= new Date(i.dueOn.getTime() + DAY_MS)) {
        if (i.coveredByCircleKesCents > 0) coveredByCircle += 1;
        else paidOnTime += 1;
      }
    }
  }
  const sums = await db.ledgerEvent.groupBy({ by: ["kind"], where: { kind: { in: ["TIP", "LENDER_LOSS"] } }, _sum: { amountMinor: true } });
  const fee = await db.$queryRaw<{ fee: bigint | null }[]>`
    SELECT SUM((meta->>'feeKesCents')::bigint) AS fee FROM "LedgerEvent" WHERE kind IN ('REPAYMENT', 'CIRCLE_COVER')`;
  const reserveKes = await reserveBalanceKes(db);
  const reserveOut = await db.reserveEvent.aggregate({ where: { kind: "OUT" }, _sum: { amountKesCents: true } });

  return {
    disbursedKes,
    disbursedUsd: kesToUsdCents(disbursedKes, fx),
    outstandingKes: outstanding,
    par30: outstanding ? atRisk30 / outstanding : 0,
    onTimeRate: due ? (paidOnTime + coveredByCircle) / due : 1,
    dueCount: due,
    coveredByCircle,
    reserveKes,
    reservePaidOutKes: reserveOut._sum.amountKesCents ?? 0,
    lenderLossCents: sums.find((s) => s.kind === "LENDER_LOSS")?._sum.amountMinor ?? 0,
    tipsCents: sums.find((s) => s.kind === "TIP")?._sum.amountMinor ?? 0,
    feeRevenueKes: Number(fee[0]?.fee ?? 0),
  };
}
