export const kes = (kesCents: number) => `KSh ${Math.round(kesCents / 100).toLocaleString("en-US")}`;

export const usd = (usdCents: number) =>
  `${usdCents < 0 ? "−" : ""}$${(Math.abs(usdCents) / 100).toLocaleString("en-US", { minimumFractionDigits: usdCents % 100 ? 2 : 0, maximumFractionDigits: 2 })}`;

export const usd0 = (usdCents: number) => `$${Math.round(usdCents / 100).toLocaleString("en-US")}`;

export const pct = (v: number) => `${(v * 100).toFixed(1)}%`;

export const ordinal = (n: number) => `${n}${["th", "st", "nd", "rd"][n % 10 < 4 && Math.floor(n / 10) !== 1 ? n % 10 : 0]}`;

export const date = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

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
