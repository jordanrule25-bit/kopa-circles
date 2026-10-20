import { PrismaClient } from "@prisma/client";
import { installmentKes } from "@kopa/core";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  approveCircle,
  circleFunding,
  closeDefaultedLoan,
  disburseCircle,
  lend,
  lenderBalanceCents,
  OpError,
  portfolioStats,
  recordMeeting,
  reserveBalanceKes,
} from "./ops";
import { MockRail } from "./rail";

// Integration tests against the dev Postgres (pnpm db:up). Every row created
// here is prefixed "optest-" and removed afterwards.
const db = new PrismaClient();
const fx = { kesPerUsd: 129 };
const T = "optest-";
const day = (n: number) => new Date(Date.UTC(2027, 0, 1 + n));

async function cleanup() {
  const circles = await db.circle.findMany({ where: { id: { startsWith: T } }, select: { id: true } });
  const ids = circles.map((c) => c.id);
  await db.$transaction([
    db.ledgerEvent.deleteMany({ where: { OR: [{ circleId: { in: ids } }, { lenderId: { startsWith: T } }] } }),
    db.reserveEvent.deleteMany({ where: { loanId: { startsWith: T } } }),
    db.lenderShare.deleteMany({ where: { circleId: { in: ids } } }),
    db.installment.deleteMany({ where: { loanId: { startsWith: T } } }),
    db.loan.deleteMany({ where: { circleId: { in: ids } } }),
    db.scoreInput.deleteMany({ where: { memberId: { startsWith: T } } }),
    db.member.deleteMany({ where: { circleId: { in: ids } } }),
    db.circle.deleteMany({ where: { id: { in: ids } } }),
    db.lender.deleteMany({ where: { userId: { startsWith: T } } }),
    db.agent.deleteMany({ where: { userId: { startsWith: T } } }),
    db.partner.deleteMany({ where: { id: { startsWith: T } } }),
    db.user.deleteMany({ where: { id: { startsWith: T } } }),
  ]);
}

/** A submitted circle with two listed loans: $100 and $50. */
async function makeCircle(key: string) {
  const circleId = `${T}${key}`;
  await db.circle.create({
    data: {
      id: circleId,
      name: `Op test ${key}`,
      town: "Testville",
      sector: "Services",
      agentId: `${T}agent`,
      partnerId: `${T}partner`,
      status: "SUBMITTED",
      story: "Fictional circle for ops tests.",
      members: {
        create: [
          { id: `${T}${key}-m1`, name: "A", business: "a", phoneHash: `${key}p1`, nationalIdHash: `${key}i1` },
          { id: `${T}${key}-m2`, name: "B", business: "b", phoneHash: `${key}p2`, nationalIdHash: `${key}i2` },
        ],
      },
    },
  });
  for (const [m, usd] of [["m1", 100], ["m2", 50]] as const) {
    await db.loan.create({
      data: { id: `${T}${key}-${m}-loan`, memberId: `${T}${key}-${m}`, circleId, principalKesCents: usd * 129 * 100, listedUsdCents: usd * 100, status: "LISTED" },
    });
  }
  return circleId;
}

beforeAll(async () => {
  await cleanup();
  await db.user.createMany({
    data: [
      { id: `${T}agent`, role: "AGENT" },
      { id: `${T}lender1`, role: "LENDER" },
      { id: `${T}lender2`, role: "LENDER" },
    ],
  });
  await db.partner.create({ data: { id: `${T}partner`, name: "Op test partner", licenseType: "SACCO" } });
  await db.agent.create({ data: { userId: `${T}agent`, town: "Testville", partnerId: `${T}partner` } });
  await db.lender.createMany({ data: [{ userId: `${T}lender1` }, { userId: `${T}lender2` }] });
  await db.reserve.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
});
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe("listing and lending", () => {
  it("approves, takes lender stakes, and refuses over-funding", async () => {
    const circleId = await makeCircle("lend");
    await expect(lend(db, { lenderId: `${T}lender1`, circleId, amountCents: 2_500, tipCents: 0, fx })).rejects.toThrow(OpError);
    await approveCircle(db, circleId);
    await expect(approveCircle(db, circleId)).rejects.toThrow(OpError);

    const r1 = await lend(db, { lenderId: `${T}lender1`, circleId, amountCents: 10_000, tipCents: 500, fx });
    expect(r1).toEqual({ chargedCents: 10_500, fullyFunded: false });
    expect(await lenderBalanceCents(db, `${T}lender1`)).toBe(0);

    await expect(lend(db, { lenderId: `${T}lender2`, circleId, amountCents: 6_000, tipCents: 0, fx })).rejects.toThrow(/left to fund/);
    const r2 = await lend(db, { lenderId: `${T}lender2`, circleId, amountCents: 5_000, tipCents: 0, fx });
    expect(r2.fullyFunded).toBe(true);
    expect(await circleFunding(db, circleId)).toEqual({ targetCents: 15_000, fundedCents: 15_000, remainingCents: 0 });
    await expect(lend(db, { lenderId: `${T}lender2`, circleId, amountCents: 2_500, tipCents: 0, fx })).rejects.toThrow(/fully funded/);
  });
});

describe("disbursal and repayment", () => {
  it("disburses, builds schedules, funds the reserve, and pays lenders back weekly", async () => {
    const circleId = await makeCircle("repay");
    await approveCircle(db, circleId);
    await lend(db, { lenderId: `${T}lender1`, circleId, amountCents: 10_000, tipCents: 0, fx });
    await lend(db, { lenderId: `${T}lender2`, circleId, amountCents: 5_000, tipCents: 0, fx });

    const reserveBefore = await reserveBalanceKes(db);
    const d = await disburseCircle(db, { circleId, on: day(0), rail: new MockRail() });
    expect(d).toEqual({ loans: 2, totalKes: 150 * 129 * 100 });
    expect((await reserveBalanceKes(db)) - reserveBefore).toBe(Math.floor(100 * 129 * 100 * 0.015) + Math.floor(50 * 129 * 100 * 0.015));
    expect(await db.installment.count({ where: { loanId: { startsWith: `${T}repay` } } })).toBe(52);
    expect((await db.circle.findUniqueOrThrow({ where: { id: circleId } })).status).toBe("REPAYING");

    // Week 1 meeting: A pays in full, B pays half and the circle covers the rest.
    const instA = installmentKes(100 * 129 * 100);
    const instB = installmentKes(50 * 129 * 100);
    const m = await recordMeeting(db, {
      circleId,
      on: day(7),
      fx,
      entries: [
        { loanId: `${T}repay-m1-loan`, memberKesCents: instA, circleKesCents: 0 },
        { loanId: `${T}repay-m2-loan`, memberKesCents: Math.floor(instB / 2 / 100) * 100, circleKesCents: instB - Math.floor(instB / 2 / 100) * 100 },
      ],
    });
    expect(m.collectedKes).toBe(instA + instB);

    const b = await db.installment.findUniqueOrThrow({ where: { loanId_n: { loanId: `${T}repay-m2-loan`, n: 1 } } });
    expect(b.paidKesCents).toBe(instB);
    expect(b.coveredByCircleKesCents).toBe(instB - Math.floor(instB / 2 / 100) * 100);
    expect(b.paidAt).toEqual(day(7));

    // Lenders split the week's principal 2:1, to the cent.
    const payouts = await db.ledgerEvent.findMany({ where: { circleId, kind: "LENDER_PAYOUT" }, orderBy: { lenderId: "asc" } });
    expect(payouts).toHaveLength(2);
    const total = payouts.reduce((t, p) => t + p.amountMinor, 0);
    expect(total).toBe(Math.floor(m.principalKes / 129));
    expect(payouts[0]!.amountMinor).toBeGreaterThan(payouts[1]!.amountMinor);
    expect(await lenderBalanceCents(db, `${T}lender1`)).toBe(payouts[0]!.amountMinor);

    const stats = await portfolioStats(db, day(8), fx);
    expect(stats.onTimeRate).toBeGreaterThan(0);
    expect(stats.coveredByCircle).toBeGreaterThanOrEqual(1);
  });

  it("closes a defaulted loan through the reserve, then lenders", async () => {
    const circleId = await makeCircle("default");
    await approveCircle(db, circleId);
    await lend(db, { lenderId: `${T}lender1`, circleId, amountCents: 15_000, tipCents: 0, fx });
    await disburseCircle(db, { circleId, on: day(0), rail: new MockRail() });

    // Drain the reserve so this loan's default lands partly on lenders.
    const reserve = await reserveBalanceKes(db);
    const hold = 50_000; // leave KSh 500
    await db.reserveEvent.create({ data: { kind: "OUT", amountKesCents: reserve - hold, loanId: null, note: "optest drain" } });

    const lost1 = await lenderBalanceCents(db, `${T}lender1`);
    const r = await closeDefaultedLoan(db, { loanId: `${T}default-m2-loan`, on: day(60), fx, note: "optest" });
    expect(r.status).toBe("DEFAULTED");
    expect(r.reserveOut).toBe(hold);
    expect(r.lenderLoss).toBe(50 * 129 * 100 - hold);
    expect(await reserveBalanceKes(db)).toBe(0);

    const share = await db.lenderShare.findFirstOrThrow({ where: { circleId } });
    expect(share.lostCents).toBe(Math.floor(r.lenderLoss / 129));
    expect(share.repaidCents).toBe(Math.floor(hold / 129));
    expect((await lenderBalanceCents(db, `${T}lender1`)) - lost1).toBe(Math.floor(hold / 129));

    // Put the drained reserve back so other tests and the seed data aren't affected.
    await db.reserveEvent.deleteMany({ where: { note: "optest drain" } });
    await expect(closeDefaultedLoan(db, { loanId: `${T}default-m2-loan`, on: day(61), fx })).rejects.toThrow(OpError);
  });
});
