// Loads the six FICTIONAL sample circles from the prototype. Wipes the database first.
// Run with `pnpm db:seed`. Deterministic: same ids and dates on every run.
import { createHash } from "node:crypto";
import {
  allocateToLenders,
  applyPayment,
  reserveContributionKes,
  scheduleFor,
  type InstallmentState,
  type LedgerEventDraft,
} from "@kopa/core";
import { Prisma, PrismaClient } from "@prisma/client";
import {
  SAMPLE_CIRCLES,
  SAMPLE_DEMO_WALLET_USD,
  SAMPLE_KES_PER_USD,
  SAMPLE_OPENING_RESERVE_USD,
} from "./sample-circles";

const prisma = new PrismaClient();

const fx = { kesPerUsd: SAMPLE_KES_PER_USD };
const TODAY = new Date("2026-10-19T00:00:00Z");
const DAY_MS = 86_400_000;
const daysBefore = (d: Date, days: number) => new Date(d.getTime() - days * DAY_MS);
const usdToKesCents = (usd: number) => usd * SAMPLE_KES_PER_USD * 100;
const fakeHash = (s: string) => createHash("sha256").update(`fictional-sample:${s}`).digest("hex");

const PARTNER_ID = "sample-partner";
const DEMO_LENDER = "sample-lender-demo";
const POOLED_LENDER = "sample-lender-pooled";

type Ledger = Prisma.LedgerEventCreateManyInput;
const toLedger = (e: LedgerEventDraft, at: Date): Ledger => ({
  at,
  kind: e.kind,
  loanId: e.loanId ?? null,
  circleId: e.circleId ?? null,
  lenderId: e.lenderId ?? null,
  amountMinor: e.amountMinor,
  currency: e.currency,
  meta: e.meta as Prisma.InputJsonValue,
});

async function main() {
  // Wipe in foreign-key order.
  await prisma.$transaction([
    prisma.ledgerEvent.deleteMany(),
    prisma.reserveEvent.deleteMany(),
    prisma.reserve.deleteMany(),
    prisma.lenderShare.deleteMany(),
    prisma.installment.deleteMany(),
    prisma.loan.deleteMany(),
    prisma.scoreInput.deleteMany(),
    prisma.member.deleteMany(),
    prisma.circle.deleteMany(),
    prisma.agent.deleteMany(),
    prisma.partner.deleteMany(),
    prisma.lender.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const users: Prisma.UserCreateManyInput[] = [
    { id: "sample-admin", name: "Sample Admin", email: "admin@example.com", role: "ADMIN" },
    { id: DEMO_LENDER, name: "Demo Lender", email: "demo.lender@example.com", role: "LENDER" },
    { id: POOLED_LENDER, name: "Other lenders (pooled)", email: "other.lenders@example.com", role: "LENDER" },
  ];
  const agents: Prisma.AgentCreateManyInput[] = [];
  const circles: Prisma.CircleCreateManyInput[] = [];
  const members: Prisma.MemberCreateManyInput[] = [];
  const loans: Prisma.LoanCreateManyInput[] = [];
  const installments: Prisma.InstallmentCreateManyInput[] = [];
  const shares: Prisma.LenderShareCreateManyInput[] = [];
  const ledger: Ledger[] = [];
  const reserveEvents: Prisma.ReserveEventCreateManyInput[] = [
    {
      kind: "IN",
      amountKesCents: usdToKesCents(SAMPLE_OPENING_RESERVE_USD),
      at: daysBefore(TODAY, 120),
      note: "Opening balance (fictional sample)",
    },
  ];
  const balance: Record<string, number> = { [DEMO_LENDER]: 0, [POOLED_LENDER]: 0 };
  const credit = (lenderId: string, cents: number) => (balance[lenderId] = (balance[lenderId] ?? 0) + cents);

  // Demo lender deposited enough for their wallet plus their two stakes.
  const demoStakes = SAMPLE_CIRCLES.reduce((t, c) => t + c.demoLenderUsd, 0);
  const deposit = (SAMPLE_DEMO_WALLET_USD + demoStakes) * 100;
  ledger.push(toLedger({ kind: "LENDER_DEPOSIT", lenderId: DEMO_LENDER, amountMinor: deposit, currency: "USD", meta: {} }, daysBefore(TODAY, 120)));
  credit(DEMO_LENDER, deposit);

  for (const [ci, c] of SAMPLE_CIRCLES.entries()) {
    const circleId = `sample-${c.key}`;
    const agentId = `sample-agent-${c.town.toLowerCase()}`;
    if (!agents.some((a) => a.userId === agentId)) {
      users.push({ id: agentId, name: `Agent ${c.town}`, phone: `+2547000000${String(ci).padStart(2, "0")}`, role: "AGENT" });
      agents.push({ userId: agentId, town: c.town, partnerId: PARTNER_ID });
    }

    const repaying = c.status === "REPAYING";
    const disbursedAt = repaying ? daysBefore(TODAY, c.week * 7) : null;
    const listedAt = disbursedAt ? daysBefore(disbursedAt, 14) : daysBefore(TODAY, 3);
    circles.push({
      id: circleId,
      name: c.name,
      town: c.town,
      sector: c.sector,
      agentId,
      partnerId: PARTNER_ID,
      cycle: c.cycle,
      score: c.score,
      status: c.status,
      story: `${c.story} (Fictional sample circle.)`,
      createdAt: listedAt,
    });

    // Lender stakes are on the whole circle, as in the prototype.
    const needUsd = c.members.reduce((t, m) => t + m.amountUsd, 0);
    const pooledUsd = repaying ? needUsd - c.demoLenderUsd : c.fundedUsd;
    const stakes = [
      { lenderId: DEMO_LENDER, amountCents: c.demoLenderUsd * 100 },
      { lenderId: POOLED_LENDER, amountCents: pooledUsd * 100 },
    ].filter((s) => s.amountCents > 0);
    if (pooledUsd > 0) {
      const pooledDeposit = pooledUsd * 100;
      ledger.push(toLedger({ kind: "LENDER_DEPOSIT", lenderId: POOLED_LENDER, amountMinor: pooledDeposit, currency: "USD", meta: {} }, listedAt));
      credit(POOLED_LENDER, pooledDeposit);
    }
    for (const s of stakes) {
      ledger.push(toLedger({ kind: "LENDER_FUNDED", lenderId: s.lenderId, circleId, amountMinor: s.amountCents, currency: "USD", meta: { fxRate: fx.kesPerUsd } }, listedAt));
      credit(s.lenderId, -s.amountCents);
    }
    const repaidByLender: Record<string, number> = {};
    const principalByWeek = new Array<number>(c.week + 1).fill(0);

    for (const [mi, m] of c.members.entries()) {
      const memberId = `${circleId}-m${mi + 1}`;
      const loanId = `${memberId}-loan${c.cycle}`;
      const principalKesCents = usdToKesCents(m.amountUsd);
      members.push({
        id: memberId,
        circleId,
        name: m.name,
        business: m.business,
        phoneHash: fakeHash(`${memberId}:phone`),
        nationalIdHash: fakeHash(`${memberId}:id`),
        consentAt: listedAt,
      });
      loans.push({
        id: loanId,
        memberId,
        circleId,
        principalKesCents,
        listedUsdCents: m.amountUsd * 100,
        status: repaying ? "REPAYING" : "LISTED",
        disbursedAt,
      });
      ledger.push(toLedger({ kind: "LOAN_LISTED", loanId, circleId, amountMinor: principalKesCents, currency: "KES", meta: {} }, listedAt));
      if (!disbursedAt) continue;

      const loan = { id: loanId, circleId, principalKesCents, feeBps: 700, weeks: 26 };
      const reserveIn = reserveContributionKes(principalKesCents);
      ledger.push(toLedger({ kind: "DISBURSEMENT", loanId, circleId, amountMinor: principalKesCents, currency: "KES", meta: {} }, disbursedAt));
      ledger.push(toLedger({ kind: "RESERVE_IN", loanId, circleId, amountMinor: reserveIn, currency: "KES", meta: {} }, disbursedAt));
      reserveEvents.push({ kind: "IN", amountKesCents: reserveIn, loanId, at: disbursedAt });

      // Sample members pay each installment on its due date, except where the
      // sample says they missed a week or the circle covered half for them.
      let state: InstallmentState[] = scheduleFor(loan, disbursedAt).map((i) => ({ ...i, paidKesCents: 0, coveredByCircleKesCents: 0 }));
      for (let w = 1; w <= c.week; w++) {
        if (m.missedWeeks?.includes(w)) continue;
        const due = state[w - 1]!;
        const owed = due.amountKesCents - due.paidKesCents;
        const circlePart = m.halfCoveredWeeks?.includes(w) ? Math.floor(owed / 2 / 100) * 100 : 0;
        for (const [amount, payer] of [
          [owed - circlePart, "MEMBER"],
          [circlePart, "CIRCLE"],
        ] as const) {
          if (amount === 0) continue;
          const r = applyPayment(loan, state, amount, payer);
          state = r.installments;
          for (const e of r.events) {
            ledger.push(toLedger(e, due.dueOn));
            principalByWeek[w]! += e.meta.principalKesCents as number;
          }
        }
      }
      for (const i of state) {
        installments.push({
          loanId,
          n: i.n,
          dueOn: i.dueOn,
          amountKesCents: i.amountKesCents,
          principalKesCents: i.principalKesCents,
          paidKesCents: i.paidKesCents,
          paidAt: i.paidKesCents > 0 ? i.dueOn : null,
          coveredByCircleKesCents: i.coveredByCircleKesCents,
        });
      }
    }

    // Weekly principal goes back to the circle's lenders, pro rata.
    for (let w = 1; w <= c.week; w++) {
      const at = daysBefore(TODAY, (c.week - w) * 7);
      for (const p of allocateToLenders(stakes, principalByWeek[w]!, fx)) {
        if (p.amountCents === 0) continue;
        ledger.push(toLedger({ kind: "LENDER_PAYOUT", lenderId: p.lenderId, circleId, amountMinor: p.amountCents, currency: "USD", meta: { week: w, fxRate: fx.kesPerUsd } }, at));
        repaidByLender[p.lenderId] = (repaidByLender[p.lenderId] ?? 0) + p.amountCents;
        credit(p.lenderId, p.amountCents);
      }
    }
    for (const s of stakes) {
      shares.push({
        id: `${circleId}-share-${s.lenderId}`,
        lenderId: s.lenderId,
        circleId,
        amountCents: s.amountCents,
        fxRateAtFunding: new Prisma.Decimal(fx.kesPerUsd),
        repaidCents: repaidByLender[s.lenderId] ?? 0,
        createdAt: listedAt,
      });
    }
  }

  await prisma.$transaction([
    prisma.user.createMany({ data: users }),
    prisma.partner.create({ data: { id: PARTNER_ID, name: "Sample SACCO (fictional)", licenseType: "SACCO" } }),
    prisma.agent.createMany({ data: agents }),
    prisma.lender.createMany({
      data: [
        { userId: DEMO_LENDER, balanceCents: balance[DEMO_LENDER]! },
        { userId: POOLED_LENDER, balanceCents: balance[POOLED_LENDER]! },
      ],
    }),
    prisma.circle.createMany({ data: circles }),
    prisma.member.createMany({ data: members }),
    prisma.loan.createMany({ data: loans }),
    prisma.installment.createMany({ data: installments }),
    prisma.lenderShare.createMany({ data: shares }),
    prisma.reserve.create({ data: { id: 1 } }),
    prisma.reserveEvent.createMany({ data: reserveEvents }),
    prisma.ledgerEvent.createMany({ data: ledger }),
  ]);

  const reserveKes = reserveEvents.reduce((t, e) => t + (e.kind === "IN" ? e.amountKesCents : -e.amountKesCents), 0);
  console.log(
    `Seeded fictional sample data: ${circles.length} circles, ${members.length} members, ${loans.length} loans, ` +
      `${installments.length} installments, ${ledger.length} ledger events. ` +
      `Reserve KSh ${(reserveKes / 100).toLocaleString("en-US")}. Demo lender balance $${(balance[DEMO_LENDER]! / 100).toFixed(2)}.`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
