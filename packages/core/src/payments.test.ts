import { describe, expect, it } from "vitest";
import { applyPayment, closeLoan, reserveContributionKes } from "./payments";
import { scheduleFor } from "./schedule";
import type { InstallmentState, LoanRef } from "./types";

const loan: LoanRef = { id: "loan1", circleId: "circle1", principalKesCents: 1_935_000, feeBps: 700, weeks: 26 };
const fresh = (): InstallmentState[] =>
  scheduleFor(loan, new Date("2026-11-02T00:00:00Z")).map((i) => ({ ...i, paidKesCents: 0, coveredByCircleKesCents: 0 }));
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

describe("reserveContributionKes", () => {
  it("is 1.5% of the disbursement, rounded down", () => {
    expect(reserveContributionKes(1_935_000)).toBe(29_025);
    expect(reserveContributionKes(1_999)).toBe(29);
  });
});

describe("applyPayment", () => {
  it("pays the oldest installment first and splits principal from fee", () => {
    const inst = fresh();
    const { events, installments } = applyPayment(loan, inst, inst[0]!.amountKesCents, "MEMBER");
    expect(events).toHaveLength(1);
    expect(events[0]).toMatchObject({
      kind: "REPAYMENT",
      loanId: "loan1",
      circleId: "circle1",
      amountMinor: inst[0]!.amountKesCents,
      currency: "KES",
      meta: { installmentN: 1, principalKesCents: inst[0]!.principalKesCents, paidBy: "MEMBER" },
    });
    expect(installments[0]!.paidKesCents).toBe(inst[0]!.amountKesCents);
    expect(installments[1]!.paidKesCents).toBe(0);
  });

  it("does not mutate its input", () => {
    const inst = fresh();
    applyPayment(loan, inst, 50_000, "MEMBER");
    expect(inst[0]!.paidKesCents).toBe(0);
  });

  it("spreads a large payment over several installments", () => {
    const inst = fresh();
    const amount = inst[0]!.amountKesCents * 2 + 10_000;
    const { events, installments } = applyPayment(loan, inst, amount, "MEMBER");
    expect(events.map((e) => e.meta.installmentN)).toEqual([1, 2, 3]);
    expect(sum(events.map((e) => e.amountMinor))).toBe(amount);
    expect(installments[2]!.paidKesCents).toBe(10_000);
  });

  it("records circle cover separately", () => {
    const { events, installments } = applyPayment(loan, fresh(), 79_600, "CIRCLE");
    expect(events[0]!.kind).toBe("CIRCLE_COVER");
    expect(installments[0]!.coveredByCircleKesCents).toBe(79_600);
  });

  it("records anything beyond the loan as an overpayment", () => {
    const total = sum(fresh().map((i) => i.amountKesCents));
    const { events } = applyPayment(loan, fresh(), total + 5_000, "MEMBER");
    expect(events.at(-1)).toMatchObject({ kind: "OVERPAYMENT", amountMinor: 5_000 });
  });

  it("returns exactly the principal once the loan is fully paid, however it was paid", () => {
    let inst = fresh();
    const principal: number[] = [];
    // Pay in awkward chunks, some by the circle.
    const chunks = [33_333, 100_001, 7, 250_000, 99_999];
    let k = 0;
    while (sum(inst.map((i) => i.amountKesCents - i.paidKesCents)) > 0) {
      const r = applyPayment(loan, inst, chunks[k % chunks.length]!, k % 3 === 0 ? "CIRCLE" : "MEMBER");
      inst = r.installments;
      for (const e of r.events) if (e.kind !== "OVERPAYMENT") principal.push(e.meta.principalKesCents as number);
      k++;
    }
    expect(sum(principal)).toBe(loan.principalKesCents);
  });

  it("rejects non-positive or fractional payments", () => {
    expect(() => applyPayment(loan, fresh(), 0, "MEMBER")).toThrow();
    expect(() => applyPayment(loan, fresh(), 10.5, "MEMBER")).toThrow();
  });
});

describe("closeLoan", () => {
  const payAll = () => applyPayment(loan, fresh(), sum(fresh().map((i) => i.amountKesCents)), "MEMBER").installments;

  it("closes a fully repaid loan with no reserve use or loss", () => {
    const r = closeLoan(loan, payAll(), 1_000_000);
    expect(r).toMatchObject({ status: "CLOSED", reserveOut: 0, lenderLoss: 0 });
    expect(r.events.map((e) => e.kind)).toEqual(["LOAN_CLOSED"]);
  });

  it("covers unpaid principal from the reserve before lenders lose anything", () => {
    // Paid 20 of 26 installments.
    let inst = fresh();
    inst = applyPayment(loan, inst, sum(inst.slice(0, 20).map((i) => i.amountKesCents)), "MEMBER").installments;
    const unpaidPrincipal = sum(inst.slice(20).map((i) => i.principalKesCents));

    const covered = closeLoan(loan, inst, 10_000_000);
    expect(covered).toMatchObject({ status: "DEFAULTED", reserveOut: unpaidPrincipal, lenderLoss: 0 });
    expect(covered.events.map((e) => e.kind)).toEqual(["RESERVE_OUT", "FEE_WRITE_OFF", "LOAN_CLOSED"]);

    const partly = closeLoan(loan, inst, 100_000);
    expect(partly).toMatchObject({ reserveOut: 100_000, lenderLoss: unpaidPrincipal - 100_000 });
    expect(partly.events.map((e) => e.kind)).toEqual(["RESERVE_OUT", "LENDER_LOSS", "FEE_WRITE_OFF", "LOAN_CLOSED"]);

    const empty = closeLoan(loan, inst, 0);
    expect(empty).toMatchObject({ reserveOut: 0, lenderLoss: unpaidPrincipal });
  });

  it("never lets the reserve pay the borrower fee", () => {
    let inst = fresh();
    inst = applyPayment(loan, inst, 100_000, "MEMBER").installments;
    const r = closeLoan(loan, inst, 100_000_000);
    expect(r.reserveOut + r.lenderLoss).toBeLessThan(loan.principalKesCents);
  });
});
