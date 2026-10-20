import {
  AFFORDABILITY_BPS,
  BPS,
  CYCLE_GROWTH,
  FEE_BPS,
  FIRST_LOAN_CAP_USD_CENTS,
  KES_CENTS_PER_SHILLING,
  LOAN_STEP_USD_CENTS,
  MAX_ACTIVE_BUREAU_LOANS,
  MAX_LOAN_USD_CENTS,
  MIN_LOAN_USD_CENTS,
  WEEKS,
} from "./constants";
import { kesToUsdCents, usdToKesCents } from "./fx";
import { assertMinorUnits, floorToShilling } from "./money";
import { installmentKes } from "./schedule";
import type { Fx, LimitDecision } from "./types";

/** $150 for the first loan, +30% per on-time cycle in whole dollars, never above $500. */
export function cycleCapUsdCents(cycle: number): number {
  if (!Number.isInteger(cycle) || cycle < 1) throw new RangeError(`Invalid cycle ${cycle}`);
  const dollars = Math.round((FIRST_LOAN_CAP_USD_CENTS / 100) * Math.pow(CYCLE_GROWTH, cycle - 1));
  return Math.min(MAX_LOAN_USD_CENTS, dollars * 100);
}

/** Largest principal whose weekly installment is at most 25% of weekly inflow. */
export function affordabilityCapKes(weeklyInflowKesCents: number, feeBps = FEE_BPS, weeks = WEEKS): number {
  assertMinorUnits(weeklyInflowKesCents, "weeklyInflowKesCents");
  if (weeklyInflowKesCents <= 0) return 0;
  // inflow * 25% * weeks / (1 + fee), in exact integer arithmetic
  return Math.floor((weeklyInflowKesCents * AFFORDABILITY_BPS * weeks) / (BPS + feeBps));
}

/**
 * Loan limit for one member, following the prototype's agent form:
 * decline above 2 active bureau loans; otherwise the lower of the cycle cap and
 * the affordability cap (rounded down to $5); decline below $50.
 */
export function memberLimit(cycle: number, weeklyInflowKesCents: number, activeLoans: number, fx: Fx): LimitDecision {
  if (activeLoans > MAX_ACTIVE_BUREAU_LOANS) return { status: "DECLINED", reason: "TOO_MANY_ACTIVE_LOANS" };

  const cycleCap = cycleCapUsdCents(cycle);
  const affordUsd = kesToUsdCents(affordabilityCapKes(weeklyInflowKesCents), fx);
  const affordStepped = Math.floor(affordUsd / LOAN_STEP_USD_CENTS) * LOAN_STEP_USD_CENTS;
  const amountUsdCents = Math.min(cycleCap, affordStepped);
  if (amountUsdCents < MIN_LOAN_USD_CENTS) return { status: "DECLINED", reason: "INFLOW_TOO_LOW" };

  // Installments round to the shilling, so step down until the 25% rule holds exactly.
  const maxInstallment = Math.floor((weeklyInflowKesCents * AFFORDABILITY_BPS) / BPS);
  let amountKesCents = floorToShilling(usdToKesCents(amountUsdCents, fx));
  while (installmentKes(amountKesCents) > maxInstallment) amountKesCents -= KES_CENTS_PER_SHILLING;

  return {
    status: "APPROVED",
    amountUsdCents,
    amountKesCents,
    installmentKesCents: installmentKes(amountKesCents),
    limitedBy: amountUsdCents < cycleCap ? "AFFORDABILITY" : "CYCLE_CAP",
  };
}
