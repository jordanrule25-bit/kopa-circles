// Every amount is an integer in minor units: KES cents or US cents.
// A whole shilling is 100 KES cents.

export type Currency = "KES" | "USD";

/** Exchange rate captured at a point in time. Rates are not money, so a decimal is fine here. */
export interface Fx {
  kesPerUsd: number;
}

export interface LoanTerms {
  principalKesCents: number;
  feeBps: number;
  weeks: number;
}

export interface LoanRef extends LoanTerms {
  id: string;
  circleId: string;
}

export interface ScheduledInstallment {
  n: number;
  dueOn: Date;
  amountKesCents: number;
  /** Principal part of amountKesCents. The rest is the borrower fee. */
  principalKesCents: number;
}

export interface InstallmentState extends ScheduledInstallment {
  paidKesCents: number;
  coveredByCircleKesCents: number;
}

export type Payer = "MEMBER" | "CIRCLE";

/** Mirrors the LedgerEventKind enum in packages/db/prisma/schema.prisma. */
export type LedgerEventKind =
  | "LOAN_LISTED"
  | "LENDER_DEPOSIT"
  | "LENDER_FUNDED"
  | "DISBURSEMENT"
  | "RESERVE_IN"
  | "REPAYMENT"
  | "CIRCLE_COVER"
  | "OVERPAYMENT"
  | "RESERVE_OUT"
  | "LENDER_PAYOUT"
  | "LENDER_LOSS"
  | "FEE_WRITE_OFF"
  | "RESCHEDULE"
  | "LOAN_CLOSED";

/** A ledger event before persistence. The db layer stamps id and time. */
export interface LedgerEventDraft {
  kind: LedgerEventKind;
  loanId?: string;
  circleId?: string;
  lenderId?: string;
  amountMinor: number;
  currency: Currency;
  meta: Record<string, unknown>;
}

export type LimitDecision =
  | {
      status: "APPROVED";
      amountUsdCents: number;
      amountKesCents: number;
      installmentKesCents: number;
      limitedBy: "CYCLE_CAP" | "AFFORDABILITY";
    }
  | {
      status: "DECLINED";
      reason: "TOO_MANY_ACTIVE_LOANS" | "INFLOW_TOO_LOW";
    };

export interface LenderStake {
  lenderId: string;
  amountCents: number;
}

export interface Payout {
  lenderId: string;
  amountCents: number;
}
