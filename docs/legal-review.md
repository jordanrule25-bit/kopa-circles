# Legal review packet

For counsel reviewing Kopa Circles before real lenders or borrowers use it.
Prepared from the live code on 20 Oct 2026. This is a briefing, not legal advice:
every position below is what the product currently assumes and needs a lawyer to
confirm or correct. Two reviews are needed: **US** (lender side) and **Kenya**
(borrower side, data, lending licence).

## 1. How the product works

- **Lenders** (anywhere, paying in USD by card) fund $25+ shares of loans to
  self-formed circles of five small-business owners in Kenya. They earn **0%
  interest, always**, and get principal back weekly as members repay. Repaid
  money sits as a **balance** in their Kopa account and can be relent. They can
  add an optional **tip** (default 5%) that funds the platform.
- **Borrowers** each have their **own loan** (first loan up to $150, rising 30%
  per on-time cycle, max $500), repaid in 26 weekly installments with a **flat
  7% fee** (about 26.4% APR). The circle is a social unit: members may choose to
  cover each other, but there is **no contractual joint liability**.
- **Money in Kenya** moves only by M-Pesa, through a **licensed Kenyan lending
  partner** (a Digital Credit Provider or SACCO) that is the **lender of record**,
  disburses, and collects. Kopa is not the lender of record during the pilot.
- **First-loss reserve**: 1.5% of every disbursement goes into a reserve that
  covers unpaid principal before lenders lose anything. Order of loss: member →
  circle (voluntary) → reserve → lenders.
- **Collections policy**: no public shaming, no contacting a borrower's phone
  contacts, no home visits; one free reschedule per loan for documented shocks.
- **Exchange rate**: lenders fund in USD, loans are in KES. Lenders bear FX risk.

## 2. Questions for US counsel

1. **Securities.** Are 0% lender participations "securities"? The design follows
   the zero-interest, no-return model (as Kiva does) to stay outside securities
   law. Does anything in the product undercut that: the balance, relending,
   the reserve, the transparency report's repayment statistics, or the word
   "lend" itself?
2. **Lender balances and money transmission.** Kopa holds repaid principal as a
   lender balance that can be relent (not yet withdrawn). Does holding and moving
   these funds make Kopa a money transmitter in any state, and how should
   balances be held (e.g. by the payment processor or a bank partner)?
3. **Entity and tax.** Nonprofit 501(c)(3) from the start, or an LLC with a
   fiscal sponsor for the pilot? Are lender shares or tips tax-deductible in
   either case? (See `decisions-brief.md`.)
4. **Tips.** Are tips a donation, a fee, or payment for a service, and how must
   they be described at checkout?
5. **Disclosures.** Is the lender wording in section 4 enough for "risk of loss"
   and "not an investment"? Where else must it appear (checkout, receipts,
   terms)? Do we need written Terms of Service and a Privacy Policy? (Neither
   exists yet.)
6. **Sanctions and KYC for lenders.** What lender identity checks are needed at
   $25 card payments, and at what thresholds?

## 3. Questions for Kenyan counsel

1. **Lending licence.** The partner is lender of record. Must Kopa itself be
   licensed (for example as a Digital Credit Provider under the Central Bank of
   Kenya's 2022 regulations) if it lists loans, sets limits and records
   repayments? What can Kopa do and not do without a licence?
2. **Pricing disclosure.** Is "flat 7% fee over 26 weeks" an acceptable way to
   present cost, and must the APR (about 26.4%) or a total cost of credit be
   shown to borrowers in a set format?
3. **Credit bureau.** Agents record each member's count of active loans at the
   credit bureau. Who may query the bureau, with what consent, and must
   repayments be reported back?
4. **Data protection (Data Protection Act 2019).** Kopa stores members' names,
   businesses, weekly mobile-money inflow and bureau loan count, and stores phone
   numbers and national IDs **only as salted one-way hashes**. Does Kopa or the
   partner register with the Office of the Data Protection Commissioner, as
   controller or processor? Is the consent in section 5 sufficient, and must it
   be given in Swahili?
5. **Lenders' view.** Lender pages show members' first names, businesses and
   repayment status (on track / catching up). Is that lawful and proportionate?
6. **Collections and rescheduling.** Is the policy in section 1 compliant with
   CBK conduct rules, and how should a reschedule be documented?
7. **Circle cover.** Members may voluntarily pay for each other. Could that be
   treated as a guarantee, which we want to avoid, and how should it be worded?

## 4. Everything a lender reads

| Where | Exact wording |
| --- | --- |
| Site description (search results) | "Lend $25 to self-formed borrower circles in Kenya. 0% interest to lenders." |
| Home page headline | "Small loans that grow together." / "Lend $25 to a circle of five small-business owners. They repay weekly on M-Pesa. You get your money back to lend again." |
| Home, "How it works" step 2 | "Lenders around the world fund the circle. Once it's fully funded, each member gets their own loan on M-Pesa." |
| Home, "Straight answers": interest | "No, never. You get back the principal you lent and nothing more. Keeping it at 0% keeps Kopa a lending community rather than an investment product." |
| Home, "Straight answers": losing money | "Yes. If a member can't repay, their circle can step in, then the first-loss reserve covers unpaid principal. Only if the reserve runs out do lenders lose some or all of their share. You also carry the exchange-rate risk between dollars and shillings." |
| Home, "Straight answers": fees | "A flat 7% fee over 26 weekly payments, about 26.4% a year. The fee and optional lender tips pay for field agents and running the platform. Separately, 1.5% of every loan goes into the first-loss reserve." |
| Home, "Straight answers": who can borrow | "People form their own circle of five. A field agent checks each member's M-Pesa inflow and credit-bureau record; no one can borrow more than a quarter of their weekly income can repay, and first loans are capped at $150." |
| Home, "Straight answers": falling behind | "The circle talks it through at their weekly meeting, and each loan gets one free reschedule for a documented shock like illness. There's no public shaming, no contacting people's phone contacts, and no home visits." |
| Home, "Straight answers": where the money goes | "Yes. A licensed Kenyan lending partner sends each member their loan on M-Pesa and collects repayments." |
| Lend form, next to the button | "0% interest. You get principal back, and you could lose some or all of it. This is not an investment." |
| Lend form, tip | "Add a 5% tip to keep Kopa running" (on by default) |
| Lend form, payment line | "$X from balance · $Y by card" |
| Circle page, side note | "Borrowers pay a flat 7% fee, about 26.4% APR. Lenders earn 0% and carry exchange-rate risk at about KSh 129 per dollar. If a payment is missed, the circle can step in; after that the reserve covers unpaid principal before lenders lose anything." |
| Thank-you after lending | "Once it's fully funded, each member gets their loan on M-Pesa. You'll see weekly repayments in your portfolio." |
| Portfolio | "principal back, 0% interest"; "Repaid to you: Principal only, 0% interest"; "Lost: After circle and reserve cover" |
| Transparency report | "Lenders earn 0%, always. Principal comes back weekly." |
| Sign-in page | "New to Kopa? Signing in creates your lender account. No password needed." |
| Sign-in email | "Sign in to Kopa Circles: [link]. This link works once and expires in 15 minutes. If you didn't ask for it, ignore this email." |

Note for counsel: the circle's help is **voluntary** everywhere in the product
("can step in", "can chip in"). Please check no wording implies a guarantee.

## 5. Everything a borrower agrees to

Borrowers don't use the site. A field agent reads the terms to them and records
consent by ticking:

> "The member agreed. I explained the loan terms (flat 7% fee, 26 weekly
> payments) and how their data is used. Each member has their own loan; the
> circle does not guarantee it."

Gaps to decide with counsel:
- There is **no written borrower agreement** yet, in English or Swahili.
- The agent's explanation is not scripted. A standard script (and a printed copy
  to leave with the member) is probably needed.
- Agents' SMS sign-in code reads: "Your Kopa Circles code is 123456. It expires in
  10 minutes. Never share it." (agents only, not borrowers).

## 6. Documents that don't exist yet

- Lender Terms of Service and Privacy Policy
- Borrower loan agreement and data notice (English and Swahili), issued by the partner
- Agent agreement (agents act for borrowers and collect personal data)
- Partner agreement (who is lender of record, who holds funds, data roles, reserve)
