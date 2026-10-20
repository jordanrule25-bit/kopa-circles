import { describe, expect, it } from "vitest";
import { aprFromFlatFee, installmentKes, scheduleFor, totalRepayableKes } from "./schedule";

const KES = 100; // cents per shilling
const loan = (principalKes: number) => ({ principalKesCents: principalKes * KES, feeBps: 700, weeks: 26 });

describe("aprFromFlatFee", () => {
  it("is about 26.4% for a 7% flat fee over 26 weeks", () => {
    expect(aprFromFlatFee(700, 26)).toBeCloseTo(0.264, 3);
  });

  it("is zero with no fee and rises with the fee", () => {
    expect(aprFromFlatFee(0, 26)).toBeCloseTo(0, 6);
    expect(aprFromFlatFee(1000, 26)).toBeGreaterThan(aprFromFlatFee(700, 26));
  });
});

describe("totalRepayableKes", () => {
  it("adds a 7% fee rounded to the whole shilling", () => {
    // KSh 19,350 * 7% = KSh 1,354.50 -> KSh 1,355
    expect(totalRepayableKes(1_935_000)).toBe(2_070_500);
  });
});

describe("installmentKes", () => {
  it("is principal * 1.07 / 26 rounded to the whole shilling", () => {
    // KSh 19,350 * 1.07 / 26 = KSh 796.33
    expect(installmentKes(1_935_000)).toBe(79_600);
    expect(installmentKes(1_935_000) % KES).toBe(0);
  });

  it("uses the defaults of 700 bps and 26 weeks", () => {
    expect(installmentKes(1_935_000)).toBe(installmentKes(1_935_000, 700, 26));
  });

  it("rejects principals that are not whole shillings", () => {
    expect(() => installmentKes(1_935_050)).toThrow();
    expect(() => installmentKes(0)).toThrow();
    expect(() => installmentKes(-100)).toThrow();
  });

  it("matches the prototype for every sample member within one shilling", () => {
    // USD amounts from prototype/index.html sample(), at the prototype's KES 129 per USD.
    const sampleUsd = [
      300, 280, 260, 240, 250, 150, 120, 150, 100, 140, 200, 190, 180, 170, 190,
      150, 130, 150, 120, 140, 220, 190, 210, 195, 200, 150, 140, 130, 140, 140,
    ];
    for (const usd of sampleUsd) {
      const principalKesCents = usd * 129 * KES;
      const prototypeKesCents = ((usd * 1.07) / 26) * 129 * KES;
      expect(Math.abs(installmentKes(principalKesCents) - prototypeKesCents)).toBeLessThanOrEqual(KES);
    }
  });
});

describe("scheduleFor", () => {
  const disbursedOn = new Date("2026-11-02T00:00:00Z");

  it("produces 26 weekly installments starting a week after disbursal", () => {
    const s = scheduleFor(loan(19_350), disbursedOn);
    expect(s).toHaveLength(26);
    expect(s.map((i) => i.n)).toEqual(Array.from({ length: 26 }, (_, k) => k + 1));
    expect(s[0]!.dueOn.toISOString()).toBe("2026-11-09T00:00:00.000Z");
    expect(s[25]!.dueOn.toISOString()).toBe("2027-05-03T00:00:00.000Z");
  });

  it("lets the last installment absorb rounding so the total is exact", () => {
    const s = scheduleFor(loan(19_350), disbursedOn);
    const regular = installmentKes(1_935_000);
    for (const i of s.slice(0, 25)) expect(i.amountKesCents).toBe(regular);
    expect(s[25]!.amountKesCents).toBe(2_070_500 - 25 * regular);
    expect(s.reduce((t, i) => t + i.amountKesCents, 0)).toBe(totalRepayableKes(1_935_000));
    for (const i of s) expect(i.amountKesCents % KES).toBe(0);
  });

  it("splits each installment into principal and fee that sum to the loan exactly", () => {
    for (const principalKes of [5_000, 12_900, 19_350, 38_700, 64_500]) {
      const s = scheduleFor(loan(principalKes), disbursedOn);
      expect(s.reduce((t, i) => t + i.principalKesCents, 0)).toBe(principalKes * KES);
      for (const i of s) {
        expect(Number.isInteger(i.principalKesCents)).toBe(true);
        expect(i.principalKesCents).toBeGreaterThan(0);
        expect(i.principalKesCents).toBeLessThan(i.amountKesCents);
      }
    }
  });

  it("works for other terms", () => {
    const s = scheduleFor({ principalKesCents: 1_000_000, feeBps: 500, weeks: 12 }, disbursedOn);
    expect(s).toHaveLength(12);
    expect(s.reduce((t, i) => t + i.amountKesCents, 0)).toBe(1_050_000);
  });
});
