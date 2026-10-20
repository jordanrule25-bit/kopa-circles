import { BPS, RESERVE_BPS } from "./constants";
import { assertMinorUnits } from "./money";
import type { InstallmentState, LedgerEventDraft, LoanRef, Payer } from "./types";

/** 1.5% of every disbursement goes into the first-loss reserve. */
export function reserveContributionKes(disbursedKesCents: number): number {
  assertMinorUnits(disbursedKesCents, "disbursedKesCents");
  return Math.floor((disbursedKesCents * RESERVE_BPS) / BPS);
}

/** Principal repaid so far on one installment, pro rata to what was paid. */
export function principalPaid(i: InstallmentState): number {
  if (i.paidKesCents >= i.amountKesCents) return i.principalKesCents;
  return Math.floor((i.paidKesCents * i.principalKesCents) / i.amountKesCents);
}

/**
 * Applies a payment to the oldest unpaid installments first. Returns one ledger
 * event per installment touched (plus OVERPAYMENT for any excess) and new
 * installment states. The input is not modified.
 */
export function applyPayment(
  loan: LoanRef,
  installments: readonly InstallmentState[],
  paidKesCents: number,
  paidBy: Payer,
): { events: LedgerEventDraft[]; installments: InstallmentState[] } {
  assertMinorUnits(paidKesCents, "paidKesCents");
  if (paidKesCents <= 0) throw new RangeError("Payment must be positive");

  const next = installments.map((i) => ({ ...i })).sort((a, b) => a.n - b.n);
  const events: LedgerEventDraft[] = [];
  let remaining = paidKesCents;

  for (const inst of next) {
    if (remaining === 0) break;
    const due = inst.amountKesCents - inst.paidKesCents;
    if (due <= 0) continue;
    const applied = Math.min(due, remaining);
    const principalBefore = principalPaid(inst);
    inst.paidKesCents += applied;
    if (paidBy === "CIRCLE") inst.coveredByCircleKesCents += applied;
    const principal = principalPaid(inst) - principalBefore;
    remaining -= applied;
    events.push({
      kind: paidBy === "CIRCLE" ? "CIRCLE_COVER" : "REPAYMENT",
      loanId: loan.id,
      circleId: loan.circleId,
      amountMinor: applied,
      currency: "KES",
      meta: { installmentN: inst.n, principalKesCents: principal, feeKesCents: applied - principal, paidBy },
    });
  }

  if (remaining > 0) {
    events.push({
      kind: "OVERPAYMENT",
      loanId: loan.id,
      circleId: loan.circleId,
      amountMinor: remaining,
      currency: "KES",
      meta: { paidBy },
    });
  }

  return { events, installments: next };
}

/**
 * Closes a loan at the end of its term. Unpaid principal is covered by the
 * first-loss reserve, and whatever the reserve can't cover is a lender loss.
 * Unpaid fees are written off; the reserve never pays the platform's fee.
 */
export function closeLoan(
  loan: LoanRef,
  installments: readonly InstallmentState[],
  reserveBalanceKes: number,
): { status: "CLOSED" | "DEFAULTED"; reserveOut: number; lenderLoss: number; events: LedgerEventDraft[] } {
  assertMinorUnits(reserveBalanceKes, "reserveBalanceKes");
  const unpaidPrincipal = installments.reduce((t, i) => t + i.principalKesCents - principalPaid(i), 0);
  const unpaidTotal = installments.reduce((t, i) => t + Math.max(0, i.amountKesCents - i.paidKesCents), 0);
  const unpaidFee = unpaidTotal - unpaidPrincipal;

  const reserveOut = Math.min(Math.max(0, reserveBalanceKes), unpaidPrincipal);
  const lenderLoss = unpaidPrincipal - reserveOut;
  const status = unpaidTotal > 0 ? "DEFAULTED" : "CLOSED";

  const base = { loanId: loan.id, circleId: loan.circleId, currency: "KES" as const };
  const events: LedgerEventDraft[] = [];
  if (reserveOut > 0) events.push({ ...base, kind: "RESERVE_OUT", amountMinor: reserveOut, meta: {} });
  if (lenderLoss > 0) events.push({ ...base, kind: "LENDER_LOSS", amountMinor: lenderLoss, meta: {} });
  if (unpaidFee > 0) events.push({ ...base, kind: "FEE_WRITE_OFF", amountMinor: unpaidFee, meta: {} });
  events.push({ ...base, kind: "LOAN_CLOSED", amountMinor: 0, meta: { status, unpaidPrincipal, unpaidFee } });

  return { status, reserveOut, lenderLoss, events };
}
