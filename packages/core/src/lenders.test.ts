import { describe, expect, it } from "vitest";
import { allocateToLenders } from "./lenders";
import { kesToUsdCents, usdToKesCents } from "./fx";

const fx = { kesPerUsd: 129 };

describe("fx", () => {
  it("converts both ways in minor units", () => {
    expect(usdToKesCents(2_500, fx)).toBe(322_500);
    expect(kesToUsdCents(322_500, fx)).toBe(2_500);
    expect(kesToUsdCents(100, fx)).toBe(0); // KSh 1 is under one US cent; conversions round down
  });

  it("rejects bad rates", () => {
    expect(() => kesToUsdCents(100, { kesPerUsd: 0 })).toThrow();
    expect(() => usdToKesCents(100, { kesPerUsd: Number.NaN })).toThrow();
  });
});

describe("allocateToLenders", () => {
  it("pays lenders pro rata to their stake", () => {
    const payouts = allocateToLenders(
      [
        { lenderId: "a", amountCents: 2_500 },
        { lenderId: "b", amountCents: 7_500 },
      ],
      usdToKesCents(1_000, fx),
      fx,
    );
    expect(payouts).toEqual([
      { lenderId: "a", amountCents: 250 },
      { lenderId: "b", amountCents: 750 },
    ]);
  });

  it("hands out every cent and nothing more, deterministically", () => {
    const shares = [
      { lenderId: "c", amountCents: 2_500 },
      { lenderId: "a", amountCents: 2_500 },
      { lenderId: "b", amountCents: 2_500 },
    ];
    const payouts = allocateToLenders(shares, usdToKesCents(100, fx), fx);
    expect(payouts.reduce((t, p) => t + p.amountCents, 0)).toBe(100);
    // 100 / 3 = 33 each with 1 cent left; ties go to the lowest lenderId.
    expect(payouts).toEqual([
      { lenderId: "c", amountCents: 33 },
      { lenderId: "a", amountCents: 34 },
      { lenderId: "b", amountCents: 33 },
    ]);
    expect(allocateToLenders(shares, usdToKesCents(100, fx), fx)).toEqual(payouts);
  });

  it("gives the leftover cents to the largest remainders", () => {
    const payouts = allocateToLenders(
      [
        { lenderId: "a", amountCents: 1 },
        { lenderId: "b", amountCents: 2 },
      ],
      usdToKesCents(10, fx),
      fx,
    );
    // 10/3 = 3.33 and 6.67 -> 3 and 7
    expect(payouts).toEqual([
      { lenderId: "a", amountCents: 3 },
      { lenderId: "b", amountCents: 7 },
    ]);
  });

  it("returns nothing for no shares and rejects zero stakes", () => {
    expect(allocateToLenders([], 1_000, fx)).toEqual([]);
    expect(() => allocateToLenders([{ lenderId: "a", amountCents: 0 }], 1_000, fx)).toThrow();
  });
});
