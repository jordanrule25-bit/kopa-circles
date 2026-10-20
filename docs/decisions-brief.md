# Decisions only Jordan can make

Three open questions from `build-spec.md` block a real pilot. For each: what it
decides, the realistic options, what each means for the software, and what to do
next. This is a planning brief, not legal, tax or financial advice. Confirm the
choices with the lawyers named in `legal-review.md`, and check current rules,
since they change.

---

## 1. Which licensed lending partner in Kenya?

**What it decides.** Who is the lender of record, who holds the money, whose
M-Pesa account (paybill) borrowers pay into, and who reports to the credit
bureau. Kopa lists loans and keeps the records; the partner lends.

| Option | What it is | Good for Kopa | Watch out for |
| --- | --- | --- | --- |
| **Digital Credit Provider (DCP)** | Non-deposit lender licensed by the Central Bank of Kenya to lend digitally | Built for small mobile-money loans; already has M-Pesa paybill, bureau reporting and CBK conduct rules in place | Their pricing and brand may clash with "flat 7%, no shaming"; check their collections practices |
| **SACCO** | Member-owned savings and credit co-operative (SASRA-regulated if deposit-taking) | Community-rooted, often already lends to market traders; aligns with circles | Borrowers usually must become SACCO members; slower to change; tech varies |
| **Microfinance bank** | Deposit-taking, CBK-licensed | Strong compliance and infrastructure | Least flexible; the business plan's point is "no MFI in the middle" |

**What the software needs from the partner** (ask these in the first meeting):
1. M-Pesa: will they run B2C disbursement and a C2B paybill for Kopa's loans, and
   share Daraja API access or callbacks? (Milestone 3 is built around this.)
2. Who holds the float: lender money arriving before disbursement, and repayments
   before they go back to lenders?
3. Will they hold the 1.5% first-loss reserve, or does Kopa?
4. Credit bureau: will they query it for members and report repayments?
5. Data: are they the data controller for borrower records, with Kopa as processor?
6. Can they accept a flat 7% fee, 26 weekly payments, and Kopa's collections policy?
7. What do they charge per loan, and what reports do they need? (The admin
   already exports loans and installments as CSV.)

**Next step.** Shortlist two or three DCPs and SACCOs near the pilot towns, and
take the seven questions above to each.

---

## 2. US entity: nonprofit first, or LLC with a fiscal sponsor?

**What it decides.** Who takes lender payments (Stripe account owner), whether
tips can be tax-deductible donations, and how the 0%-interest model is framed.

| Option | How it works | Good for Kopa | Watch out for |
| --- | --- | --- | --- |
| **501(c)(3) nonprofit** | Apply to the IRS for charitable status | Matches the 0% lending-community model; tips can be donations; grants open up | Takes months; board and governance required; harder to raise equity later |
| **LLC + fiscal sponsor** | An existing charity hosts Kopa as a project and receives funds on its behalf | Starts in weeks; donations to the sponsor are deductible; good for a pilot | Sponsor takes a fee (often 5–10%) and must approve the lending activity; the lender balance may be hard for them to hold |
| **LLC or C-corp alone** | Ordinary company | Fastest and simplest; can raise investment | Tips are not deductible; securities and money-transmission questions get sharper for a for-profit holding lender funds |

**Questions to settle with a lawyer:** whether lender balances can be held by the
payment processor rather than Kopa (money transmission), and how each option
affects the securities question in `legal-review.md`.

**Next step.** One consultation with a US nonprofit or fintech lawyer before
taking any lender money. Bring `legal-review.md`.

---

## 3. Who is the Kenya-side operator?

**What it decides.** The person who uses the admin side every day: approves
listings, marks disbursals, records weekly meetings, follows up on late
payments, manages agents. The build spec's Milestone 1 gate is "an ops person
can run 10 circles for a full cycle without the spreadsheet".

| Option | Good for | Watch out for |
| --- | --- | --- |
| **Hire a part-time operations lead** | Clear ownership; can recruit and coach agents | Cost; needs supervision at first |
| **Partner's staff do it** | Already handle disbursals and collections | Less control over borrower experience; data-sharing terms needed |
| **A senior field agent doubles as operator** | Cheap; knows the circles | Approving their own circles is a conflict of interest; needs a second approver |

**What they'll need on day one:** an admin account (created like yours), the
**Today** dashboard, a phone or laptop with data, and a written collections
policy (section 1 of `legal-review.md`).

**Next step.** Decide who approves listings: someone other than the agent who
formed the circle.

---

## What is ready once these are decided

| Decision | What the software then needs |
| --- | --- |
| Partner chosen | Milestone 3: real M-Pesa disbursal and repayment through their Daraja access (currently a mock) |
| Entity chosen | Milestone 2: Stripe account in the entity's name (lending currently uses a mock card charge) |
| Operator chosen | Create their admin account; they add agents under **Agents** |
