# Kopa Circles — Business Plan (condensed)

Full version with charts: https://claude.ai/code/artifact/c1850b41-ab75-45c5-8135-b16812172d81

## Summary
Crowdfunded micro-lending. Lenders fund $25 shares of loans to self-formed circles of 5
borrowers in Kenya; money moves only by mobile money. Combines Kiva's lender product
(small shares, stories, repayment updates) with Grameen's circle mechanics (peer
selection, weekly meetings, step-up loan sizes), and Zidisha's direct-to-wallet
disbursement with no MFI in the middle. "Kopa" = "borrow" in Swahili; placeholder name.

## Problem
- 75% of adults in low/middle-income economies have an account; 1.3B still don't.
  40% of adults in Sub-Saharan Africa use mobile money (Global Findex 2025).
- MFI nominal rates run 20–50% vs 5–20% at banks. Kiva field partners average ~22%;
  Zidisha's founder found Kiva-funded loans in West Africa cost >35% all-in.
- ~45% of a typical MFI's operating cost is fixed per-borrower cost (officers, branches),
  adding 6–10 points to the rate on its own.
- Six RCTs: microcredit is "modestly positive, not transformative". Pitch cheaper,
  safer working capital and measure business outcomes; don't promise to end poverty.

## Model
- Circle of 5, each member with their own loan. Soft group liability: circle helps a
  member who falls behind, but no legal cross-guarantee (Giné & Karlan, Philippines:
  removing joint liability didn't change repayment and attracted more clients).
- Loan: $100–500/member, flat 7% fee, 26 weekly installments ≈ 26% APR, shown upfront.
- Lenders earn 0% (keeps notes outside US securities law; cf. SEC vs Prosper 2008).
  Lenders may tip; tips fund operations (over two-thirds of Kiva's revenue).

## Underwriting — four cheap layers
1. Circle formation: members choose each other, no shared household, agent verifies ID.
2. Cash-flow scoring from the member's mobile-money statement (with consent) sets a
   size limit only — never sole approval.
3. Graduated limits: $150 first loan, +30% per on-time cycle, max $500.
4. First-loss reserve: 1.5% of every loan; covers lender losses up to its balance.

Guardrails (lessons from Andhra Pradesh 2010): bureau check, decline >2 active loans;
installment ≤ 25% of verified weekly inflow; no shaming/home-visit collections;
one free reschedule per loan for documented shocks.

## Unit economics (per $300 loan)
| Line | % | $ |
| --- | --- | --- |
| Borrower fee | 7.0 | 21.00 |
| Lender tips (assumption) | 5.0 | 15.00 |
| Mobile money in/out | −2.0 | −6.00 |
| FX | −1.0 | −3.00 |
| Local agent | −3.0 | −9.00 |
| First-loss reserve | −1.5 | −4.50 |
| KYC + bureau | −0.3 | −1.00 |
| **Contribution** | **4.2** | **12.50** |

5-year sketch: loans 1.5K → 10K → 40K → 100K → 200K; fixed costs $0.35M → $3.5M.
Net −0.33, −0.65, −0.93, −0.83, +0.25 ($M). Years 1–4 need ≈ $2.75M of grant/impact
capital. Breakeven ≈ $84M lent/year. If tips are 3% not 5%, breakeven volume roughly doubles.

## Legal structure (to review with counsel)
- US 501(c)(3): runs lender platform, takes tips/grants, sends funds to Kenya.
- Kenyan licensed lender (CBK Digital Credit Provider licence; 227 licensed as of
  Apr 2026, >800 applications since 2022). Plan 9–12 months; pilot through an
  already-licensed DCP or SACCO.
- Data: consent + registration with Kenya's Office of the Data Protection Commissioner.

## Top risks
Tips short of 5% · defaults above reserve · over-indebtedness · ghost circles/fraud ·
licensing delay · KES depreciation · scoring bias.

## 12-month roadmap
Validate (Oct–Dec 2026) → Build (Jan–Mar 2027) → Pilot 100 circles (Apr–Jun 2027) →
Prove second cycle + close $750K pre-seed (Jul–Sep 2027).
Gate before any raise: cycle 1 ≥ 95% repaid.

## Putting it into practice (sequence)
1. Weeks 1–4: 20–30 WhatsApp interviews with Kenyan micro-business owners; 5 with
   SACCO/DCP/chama/Kiva/Zidisha people.
2. Weeks 4–8: shortlist 3 licensed partners as lender of record; find Kenya-side
   co-founder; 2 hours with a nonprofit/fintech lawyer on the two-entity structure.
3. Months 3–6: manual pilot — 10 circles, ~50 borrowers, ~$15K, spreadsheet + partner
   M-Pesa + WhatsApp. Gate: ≥95% repayment over one 26-week cycle.
4. Months 6–12: build the product (see build-spec.md), apply for grants, raise pre-seed,
   file for own licence.
