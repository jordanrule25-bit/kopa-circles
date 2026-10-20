# Kopa Circles — Build Spec

Goal of the build: replace the manual pilot's spreadsheet with real software, in an
order that lets the pilot start before the software is finished. Each milestone is
shippable on its own. Work the milestones in order; inside a milestone, the task list
is a suggested order.

## Stack

| Layer | Choice | Why |
| --- | --- | --- |
| Monorepo | pnpm workspaces + Turborepo | `apps/web`, `apps/agent`, `packages/core`, `packages/db` |
| Web app (lenders + admin) | Next.js 15 App Router, TypeScript, Tailwind | Server actions for writes, RSC for lists |
| Agent app (field agents) | Same Next.js app, `/agent` routes, mobile-first PWA | Agents use Android phones; a PWA avoids app-store delay. Native later if needed. |
| Database | Postgres (Supabase or Neon) + Prisma | Row-level security later for partner access |
| Auth | In-house passwordless sign-in (see decision below): email link for lenders and admins, SMS code for agents | Borrowers don't log in during the pilot; agents act for them |
| Payments (lenders) | Stripe Checkout, USD | Donation-style flow, tips as a second line item |
| Payments (borrowers) | `PaymentRail` interface → `MockRail` now, `MpesaRail` (Safaricom Daraja B2C/C2B via the licensed partner) at Milestone 3 | |
| Jobs | Cron route (Vercel cron) or Inngest | Weekly repayment run, reserve accounting, reminders |
| Observability | Sentry + a simple admin audit log | |

## Data model (Prisma, minimal)

```
User        id, email?, phone?, role: LENDER|AGENT|ADMIN|PARTNER, createdAt
Lender      userId, balanceCents (USD), tipDefaultBps
Agent       userId, town, partnerId, active
Partner     id, name, licenseType: DCP|SACCO, country
Circle      id, name, town, sector, agentId, partnerId, cycle, score: A|B|C,
            status: FORMING|RAISING|REPAYING|COMPLETE|PAUSED, story, createdAt
Member      id, circleId, name, business, phoneHash, nationalIdHash, consentAt
Loan        id, memberId, circleId, principalKes, feeBps=700, weeks=26,
            status: LISTED|FUNDED|DISBURSED|REPAYING|CLOSED|DEFAULTED,
            disbursedAt, closedAt
Installment id, loanId, n (1..26), dueOn, amountKes, paidKes, paidAt,
            coveredByCircleKes
LenderShare id, lenderId, loanId? / circleId, amountCents (USD), fxRateAtFunding,
            repaidCents, lostCents
LedgerEvent id, at, kind, loanId?, circleId?, lenderId?, amountMinor, currency,
            meta jsonb          -- append-only; balances are derived from this
Reserve     singleton row + ReserveEvent (IN from 1.5% of disbursals, OUT to cover)
ScoreInput  memberId, source: MPESA_STATEMENT|BUREAU|AGENT, weeklyInflowKes,
            activeLoans, capturedAt
```

All amounts are integers in minor units. FX is captured at funding time and at each
repayment; lenders bear FX risk and see it.

## `packages/core` — pure functions (write these first, with tests)

```ts
installmentKes(principalKes, feeBps=700, weeks=26): number        // rounds to whole shilling, last installment absorbs rounding
scheduleFor(loan, disbursedOn): Installment[]
aprFromFlatFee(feeBps, weeks): number                              // ~0.264 for 700 bps / 26 weeks
cycleCapUsdCents(cycle): number                                    // 15000 * 1.3^(cycle-1), max 50000
affordabilityCapKes(weeklyInflowKes): number                       // 25% of inflow * 26 / 1.07
memberLimit(cycle, weeklyInflowKes, activeLoans, fx): Decision     // APPROVED(amount) | DECLINED(reason)
applyPayment(loan, installments, paidKes, paidBy: MEMBER|CIRCLE): LedgerEvent[]
closeLoan(loan, installments, reserveBalanceKes): { reserveOut, lenderLoss, events }
allocateToLenders(shares, principalRepaidKes, fx): Payout[]        // pro rata, deterministic rounding
```

The prototype (`prototype/index.html`) contains a working JS version of most of this.
Port it, then make the numbers match the prototype on the sample circles.

## Milestones

### M0 — Repo and core math (week 1)
- [ ] Scaffold monorepo, Next.js app, Prisma schema above, local Postgres via docker-compose
- [ ] Implement `packages/core` with Vitest tests; APR for 700 bps/26 weeks must be 26.4% ±0.1
- [ ] Seed script with the 6 fictional circles from the prototype
- [ ] CI: lint, typecheck, test on every push

### M1 — Pilot ops tool (weeks 2–4) — this is what the manual pilot actually needs
- [ ] Agent app: create circle, add 5 members, capture consent, enter weekly inflow and bureau count, run `memberLimit`, submit for listing
- [ ] Admin: approve listing, mark disbursed (manual M-Pesa via partner for now), record weekly meeting payments per member, mark circle-covered payments
- [ ] Weekly job: generate due installments, flag arrears, compute PAR30, email the admin a Monday summary
- [ ] Reserve ledger with balance and history
- [ ] Export: CSV of all loans/installments for the partner and for grant reporting
- Gate: an ops person can run 10 circles for a full cycle without the spreadsheet

### M2 — Lender product (weeks 4–8)
- [ ] Public circle pages (story, members first-name-only, repayment record, reserve balance, all-in APR shown)
- [ ] Stripe Checkout: lend $25+ with default 5% tip; lender balance credited
- [ ] Lender dashboard: outstanding, repaid, lost, relend button, monthly email
- [ ] FX: capture rate at funding; show lender their USD exposure
- [ ] Legal copy: 0% interest, risk of loss, not an investment (counsel reviews before launch)
- Gate: 20 real lenders fund 1 circle end to end

### M3 — Mobile money (weeks 8–12)
- [ ] `MpesaRail` behind the `PaymentRail` interface, operating under the partner's Daraja credentials
- [ ] B2C disbursement to each member's wallet; C2B paybill for repayments with auto-matching to installments
- [ ] SMS reminders (Africa's Talking) two days before each due date, in English and Swahili
- [ ] Reconciliation screen: partner statement vs ledger
- Gate: one circle disbursed and repaid with no manual money movement

### M4 — Scoring and scale (months 4–6)
- [ ] M-Pesa statement parser (PDF/CSV) → weekly inflow, regularity, existing loan payments
- [ ] Limit model: starts as the rules above; log every decision so a learned model can be evaluated against it later
- [ ] Fairness audit report: approval and limit by gender, town, sector
- [ ] Circle score (A/B/C) from repayment history, computed nightly
- [ ] Partner portal: read-only view of their portfolio

## Out of scope until the pilot passes its gate
Native apps, lender interest, multi-country, token/blockchain anything, automated
collections, a public API.

## Decisions

- **Sign-in is built in-house, not with Auth.js** (Oct 2026). Auth.js v5 was still in
  beta and neither v4 nor v5 does SMS codes natively. The in-house version is small
  (`packages/db/src/auth.ts`, with tests): random single-use secrets stored only as
  HMACs, 15-minute email links, 10-minute SMS codes with 5 tries, 5 requests per
  person per hour, and database sessions so an admin can sign an agent out everywhere.
  Email goes through Resend and SMS through Africa's Talking when their keys are set;
  in development both land in the dev outbox at `/dev/outbox`.

## Open questions for Jordan (answer in this file as they're settled)
- Which licensed partner? Determines Daraja setup and who holds the float.
- US entity: nonprofit first, or LLC with a fiscal sponsor for the pilot?
- Who is the Kenya-side operator who approves listings and runs weekly payments?
