import { KES_CENTS_PER_SHILLING } from "./constants";

export function assertMinorUnits(value: number, name: string): void {
  if (!Number.isSafeInteger(value)) throw new RangeError(`${name} must be an integer in minor units, got ${value}`);
}

export function roundToShilling(kesCents: number): number {
  return Math.round(kesCents / KES_CENTS_PER_SHILLING) * KES_CENTS_PER_SHILLING;
}

export function floorToShilling(kesCents: number): number {
  return Math.floor(kesCents / KES_CENTS_PER_SHILLING) * KES_CENTS_PER_SHILLING;
}

export function assertWholeShillings(kesCents: number, name: string): void {
  assertMinorUnits(kesCents, name);
  if (kesCents <= 0 || kesCents % KES_CENTS_PER_SHILLING !== 0) {
    throw new RangeError(`${name} must be a positive whole number of shillings, got ${kesCents} KES cents`);
  }
}
