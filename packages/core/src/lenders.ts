import { kesToUsdCents } from "./fx";
import type { Fx, LenderStake, Payout } from "./types";

/**
 * Splits repaid principal between lenders pro rata to their stake, in USD at
 * today's rate (lenders bear FX risk). Uses the largest-remainder method so
 * every cent is handed out; ties go to the lowest lenderId. Output keeps input order.
 */
export function allocateToLenders(shares: readonly LenderStake[], principalRepaidKesCents: number, fx: Fx): Payout[] {
  if (shares.length === 0) return [];
  for (const s of shares) {
    if (!Number.isSafeInteger(s.amountCents) || s.amountCents <= 0) {
      throw new RangeError(`Stake for ${s.lenderId} must be a positive integer, got ${s.amountCents}`);
    }
  }
  const totalUsd = kesToUsdCents(principalRepaidKesCents, fx);
  const totalStake = shares.reduce((t, s) => t + s.amountCents, 0);

  const parts = shares.map((s, index) => {
    const exact = totalUsd * s.amountCents;
    return { index, lenderId: s.lenderId, cents: Math.floor(exact / totalStake), remainder: exact % totalStake };
  });
  let leftover = totalUsd - parts.reduce((t, p) => t + p.cents, 0);

  const order = [...parts].sort(
    (a, b) => b.remainder - a.remainder || (a.lenderId < b.lenderId ? -1 : a.lenderId > b.lenderId ? 1 : 0),
  );
  for (const p of order) {
    if (leftover === 0) break;
    p.cents += 1;
    leftover -= 1;
  }

  return parts.map((p) => ({ lenderId: p.lenderId, amountCents: p.cents }));
}
