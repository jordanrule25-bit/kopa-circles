# Kopa Circles

Crowdfunded micro-lending platform. Lenders worldwide fund $25 shares of loans to
self-formed borrower circles of 5 in Kenya. Money moves only by mobile money (M-Pesa).
Kiva's lender product + Grameen's circle mechanics, with no MFI in the middle.

Read `docs/build-spec.md` before starting any task. `docs/business-plan.md` is the
why; `prototype/index.html` is a clickable reference for the UX and the loan math.

## Domain rules (do not change without updating docs/business-plan.md)

- Each member has their OWN loan. The circle is a social unit, not a legal co-signer.
  Never implement contractual joint liability.
- Lenders earn 0% interest, always. Principal only. This keeps lender notes outside
  US securities law. Any "return" feature is out of scope.
- Loan terms: flat 7% borrower fee, 26 weekly installments. Installment = amount * 1.07 / 26.
- Limits: first loan ≤ $150; cap rises 30% per on-time cycle; hard max $500.
  Weekly installment ≤ 25% of verified weekly mobile-money inflow.
  Decline anyone with > 2 active loans at the credit bureau.
- Missed payment order: borrower → circle covers → first-loss reserve → lender loss.
  Reserve is funded by 1.5% of every disbursement. Lenders see the reserve balance.
- Collections: no public shaming, no contacting phone contacts, no home visits.
  One free reschedule per loan for documented shocks.
- Money is stored as integer minor units (KES cents / USD cents). Never floats.
- Kenya is the only market. KES is the loan currency; USD is the lender currency.
- The platform is NOT the lender of record in the pilot. A licensed partner (DCP or SACCO)
  disburses and collects. Design the ledger so the partner can be swapped later.

## Conventions

- TypeScript strict everywhere. Next.js (App Router) + Postgres + Prisma. See build-spec.
- All loan math lives in `packages/core` as pure functions with unit tests.
  UI never computes installments, limits or APR itself.
- Every state change in a loan's life is an append-only ledger event. No in-place edits
  to balances.
- Tests: Vitest for core and API, Playwright for the three critical flows
  (lend, agent lists circle, weekly repayment run).
- Sample/seed data is fictional. Keep it clearly labelled.
- Don't add payment-provider integrations beyond a mocked M-Pesa adapter until
  Milestone 3 (see build-spec). Build against the `PaymentRail` interface.

## Commands

    pnpm install
    pnpm dev           # web app on :3000
    pnpm test          # core + api unit tests
    pnpm test:e2e      # playwright
    pnpm db:migrate    # prisma migrate dev
    pnpm db:seed       # loads fictional sample circles
    pnpm --filter @kopa/db create-admin you@example.com "Name"   # first admin

(Create these scripts in Milestone 0 if they don't exist yet.)
