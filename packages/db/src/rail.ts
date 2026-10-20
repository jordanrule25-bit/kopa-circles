// Borrower money movement. MockRail now; MpesaRail (Daraja via the licensed
// partner) arrives in Milestone 3 behind the same interface.

export interface Disbursement {
  loanId: string;
  memberId: string;
  amountKesCents: number;
}

export interface PaymentRail {
  readonly name: string;
  disburse(d: Disbursement): Promise<{ reference: string }>;
}

export class MockRail implements PaymentRail {
  readonly name = "MOCK";
  private n = 0;
  async disburse(d: Disbursement) {
    this.n += 1;
    return { reference: `MOCK-${d.loanId.slice(-6).toUpperCase()}-${this.n}` };
  }
}
