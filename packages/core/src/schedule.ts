import { BPS, FEE_BPS, WEEKS } from "./constants";
import { assertWholeShillings, roundToShilling } from "./money";
import type { LoanTerms, ScheduledInstallment } from "./types";

const DAY_MS = 86_400_000;

function assertTerms(feeBps: number, weeks: number): void {
  if (!Number.isInteger(feeBps) || feeBps < 0) throw new RangeError(`Invalid feeBps ${feeBps}`);
  if (!Number.isInteger(weeks) || weeks < 1) throw new RangeError(`Invalid weeks ${weeks}`);
}

/** Flat borrower fee, rounded to the whole shilling. */
export function feeKes(principalKesCents: number, feeBps = FEE_BPS): number {
  assertWholeShillings(principalKesCents, "principalKesCents");
  return roundToShilling((principalKesCents * feeBps) / BPS);
}

export function totalRepayableKes(principalKesCents: number, feeBps = FEE_BPS): number {
  return principalKesCents + feeKes(principalKesCents, feeBps);
}

/** Regular weekly installment, rounded to the whole shilling. The last one absorbs rounding (see scheduleFor). */
export function installmentKes(principalKesCents: number, feeBps = FEE_BPS, weeks = WEEKS): number {
  assertTerms(feeBps, weeks);
  return roundToShilling(totalRepayableKes(principalKesCents, feeBps) / weeks);
}

/**
 * Weekly schedule, first installment due one week after disbursal.
 * Each installment carries its principal part so lender repayments can be derived
 * exactly: the cumulative principal tracks the cumulative amount pro rata, and the
 * last installment lands on the full principal.
 */
export function scheduleFor(loan: LoanTerms, disbursedOn: Date): ScheduledInstallment[] {
  const { principalKesCents, feeBps, weeks } = loan;
  const total = totalRepayableKes(principalKesCents, feeBps);
  const regular = installmentKes(principalKesCents, feeBps, weeks);
  const start = Date.UTC(disbursedOn.getUTCFullYear(), disbursedOn.getUTCMonth(), disbursedOn.getUTCDate());

  const out: ScheduledInstallment[] = [];
  let cumAmount = 0;
  let cumPrincipal = 0;
  for (let n = 1; n <= weeks; n++) {
    const amountKesCents = n < weeks ? regular : total - regular * (weeks - 1);
    cumAmount += amountKesCents;
    const nextCumPrincipal = Math.floor((principalKesCents * cumAmount) / total);
    out.push({
      n,
      dueOn: new Date(start + n * 7 * DAY_MS),
      amountKesCents,
      principalKesCents: nextCumPrincipal - cumPrincipal,
    });
    cumPrincipal = nextCumPrincipal;
  }
  return out;
}

/**
 * Annualised rate (weekly IRR * 52) a borrower pays for a flat fee spread over
 * equal weekly installments. Matches weeklyAPR() in the prototype.
 */
export function aprFromFlatFee(feeBps: number, weeks: number): number {
  assertTerms(feeBps, weeks);
  const installment = (1 + feeBps / BPS) / weeks;
  const presentValue = (r: number) => {
    let pv = 0;
    for (let t = 1; t <= weeks; t++) pv += installment / Math.pow(1 + r, t);
    return pv;
  };
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 100; k++) {
    const mid = (lo + hi) / 2;
    if (presentValue(mid) > 1) lo = mid;
    else hi = mid;
  }
  return lo * 52;
}
