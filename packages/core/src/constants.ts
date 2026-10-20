// Loan terms and limits. Changing any of these is a business decision:
// update docs/business-plan.md first (see CLAUDE.md).

export const BPS = 10_000;
export const KES_CENTS_PER_SHILLING = 100;

export const FEE_BPS = 700;
export const WEEKS = 26;
export const RESERVE_BPS = 150;

export const FIRST_LOAN_CAP_USD_CENTS = 15_000;
export const CYCLE_GROWTH = 1.3;
export const MAX_LOAN_USD_CENTS = 50_000;
/** From the prototype: limits below this are declined; approved amounts step in $5. */
export const MIN_LOAN_USD_CENTS = 5_000;
export const LOAN_STEP_USD_CENTS = 500;

/** Weekly installment may be at most this share of verified weekly mobile-money inflow. */
export const AFFORDABILITY_BPS = 2_500;
export const MAX_ACTIVE_BUREAU_LOANS = 2;
