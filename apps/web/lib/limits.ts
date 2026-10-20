import { memberLimit, type Fx, type LimitDecision } from "@kopa/core";

interface ScoreInputLike {
  weeklyInflowKesCents: number | null;
  activeLoans: number | null;
  capturedAt: Date;
}

/** Limit for a member from their most recent score input. The math lives in @kopa/core. */
export function limitFor(cycle: number, inputs: ScoreInputLike[], fx: Fx): LimitDecision | null {
  const latest = [...inputs].sort((a, b) => b.capturedAt.getTime() - a.capturedAt.getTime())[0];
  if (!latest || latest.weeklyInflowKesCents == null || latest.activeLoans == null) return null;
  return memberLimit(cycle, latest.weeklyInflowKesCents, latest.activeLoans, fx);
}
