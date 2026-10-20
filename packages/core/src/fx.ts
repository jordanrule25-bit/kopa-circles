import { assertMinorUnits } from "./money";
import type { Fx } from "./types";

function assertRate(fx: Fx): void {
  if (!Number.isFinite(fx.kesPerUsd) || fx.kesPerUsd <= 0) throw new RangeError(`Invalid FX rate ${fx.kesPerUsd}`);
}

export function usdToKesCents(usdCents: number, fx: Fx): number {
  assertMinorUnits(usdCents, "usdCents");
  assertRate(fx);
  return Math.round(usdCents * fx.kesPerUsd);
}

/** Rounds down, so lenders are never shown or paid more than was collected. */
export function kesToUsdCents(kesCents: number, fx: Fx): number {
  assertMinorUnits(kesCents, "kesCents");
  assertRate(fx);
  return Math.floor(kesCents / fx.kesPerUsd);
}
