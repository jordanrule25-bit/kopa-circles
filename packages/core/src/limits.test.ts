import { describe, expect, it } from "vitest";
import { affordabilityCapKes, cycleCapUsdCents, memberLimit } from "./limits";
import { installmentKes } from "./schedule";

const fx = { kesPerUsd: 129 };
const kes = (shillings: number) => shillings * 100;

describe("cycleCapUsdCents", () => {
  it("starts at $150 and rises 30% per on-time cycle, in whole dollars", () => {
    expect(cycleCapUsdCents(1)).toBe(15_000);
    expect(cycleCapUsdCents(2)).toBe(19_500);
    expect(cycleCapUsdCents(3)).toBe(25_400); // $253.50 rounds to $254, as in the prototype
    expect(cycleCapUsdCents(4)).toBe(33_000);
    expect(cycleCapUsdCents(5)).toBe(42_800);
  });

  it("never exceeds the $500 hard max", () => {
    expect(cycleCapUsdCents(6)).toBe(50_000);
    expect(cycleCapUsdCents(20)).toBe(50_000);
  });

  it("rejects cycles below 1", () => {
    expect(() => cycleCapUsdCents(0)).toThrow();
    expect(() => cycleCapUsdCents(1.5)).toThrow();
  });
});

describe("affordabilityCapKes", () => {
  it("is the principal whose weekly installment is 25% of weekly inflow", () => {
    // KSh 2,000 * 25% * 26 / 1.07 = KSh 12,149.53
    expect(affordabilityCapKes(kes(2_000))).toBe(1_214_953);
  });

  it("is zero with no inflow", () => {
    expect(affordabilityCapKes(0)).toBe(0);
  });
});

describe("memberLimit", () => {
  it("matches the prototype's sample circle on the agent form", () => {
    // prototype SAMPLE_MEMBERS: [weekly inflow KSh, active loans], cycle 1
    expect(memberLimit(1, kes(6_500), 1, fx)).toMatchObject({ status: "APPROVED", amountUsdCents: 15_000, limitedBy: "CYCLE_CAP" });
    expect(memberLimit(1, kes(9_000), 0, fx)).toMatchObject({ status: "APPROVED", amountUsdCents: 15_000 });
    expect(memberLimit(1, kes(4_800), 2, fx)).toMatchObject({ status: "APPROVED", amountUsdCents: 15_000 });
    expect(memberLimit(1, kes(5_200), 1, fx)).toMatchObject({ status: "APPROVED", amountUsdCents: 15_000 });
    expect(memberLimit(1, kes(7_000), 3, fx)).toEqual({ status: "DECLINED", reason: "TOO_MANY_ACTIVE_LOANS" });
  });

  it("limits by inflow in $5 steps", () => {
    // KSh 2,000/week supports $94.18 -> $90
    expect(memberLimit(1, kes(2_000), 0, fx)).toMatchObject({
      status: "APPROVED",
      amountUsdCents: 9_000,
      amountKesCents: kes(11_610),
      limitedBy: "AFFORDABILITY",
    });
  });

  it("declines when inflow supports less than $50", () => {
    expect(memberLimit(1, kes(1_000), 0, fx)).toEqual({ status: "DECLINED", reason: "INFLOW_TOO_LOW" });
  });

  it("checks active loans before inflow", () => {
    expect(memberLimit(1, 0, 3, fx)).toEqual({ status: "DECLINED", reason: "TOO_MANY_ACTIVE_LOANS" });
  });

  it("uses the cycle cap for later cycles", () => {
    expect(memberLimit(3, kes(50_000), 0, fx)).toMatchObject({ amountUsdCents: 25_400, limitedBy: "CYCLE_CAP" });
    expect(memberLimit(9, kes(50_000), 0, fx)).toMatchObject({ amountUsdCents: 50_000 });
  });

  it("never approves an installment above 25% of weekly inflow", () => {
    for (let inflow = kes(1_000); inflow <= kes(20_000); inflow += kes(37)) {
      for (const rate of [110, 129, 145.5]) {
        const d = memberLimit(1, inflow, 0, { kesPerUsd: rate });
        if (d.status !== "APPROVED") continue;
        expect(d.amountKesCents % 100).toBe(0);
        expect(d.installmentKesCents).toBe(installmentKes(d.amountKesCents));
        expect(d.installmentKesCents * 4).toBeLessThanOrEqual(inflow);
      }
    }
  });
});
