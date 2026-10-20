import type { Fx } from "@kopa/core";

/** Rate used for limits and listings until a live FX feed exists. */
export function currentFx(): Fx {
  const kesPerUsd = Number(process.env.KES_PER_USD ?? 129);
  if (!Number.isFinite(kesPerUsd) || kesPerUsd <= 0) throw new Error("KES_PER_USD must be a positive number");
  return { kesPerUsd };
}
