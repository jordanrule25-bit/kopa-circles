export const kes = (kesCents: number) => `KSh ${Math.round(kesCents / 100).toLocaleString("en-US")}`;

export const usd = (usdCents: number) =>
  `$${(usdCents / 100).toLocaleString("en-US", { minimumFractionDigits: usdCents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const STATUS_LABEL: Record<string, string> = {
  FORMING: "Forming",
  SUBMITTED: "Waiting for approval",
  RAISING: "Raising",
  REPAYING: "Repaying",
  COMPLETE: "Complete",
  PAUSED: "Paused",
};

export const DECLINE_LABEL: Record<string, string> = {
  TOO_MANY_ACTIVE_LOANS: "More than 2 active loans at the credit bureau",
  INFLOW_TOO_LOW: "Weekly inflow supports less than $50",
};
