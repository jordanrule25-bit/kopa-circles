"use server";

import { approveCircle, closeDefaultedLoan, disburseCircle, MockRail, OpError, prisma, recordMeeting } from "@kopa/db";
import { revalidatePath } from "next/cache";
import { currentFx } from "@/lib/fx";
import { requireAdmin } from "@/lib/session";

export type AdminState = { error?: string; ok?: string };

const asDate = (v: FormDataEntryValue | null) => {
  const s = String(v ?? "");
  const d = /^\d{4}-\d{2}-\d{2}$/.test(s) ? new Date(`${s}T00:00:00Z`) : null;
  if (!d || Number.isNaN(d.getTime())) throw new OpError("Choose a date.");
  return d;
};

async function guard(fn: () => Promise<string>): Promise<AdminState> {
  await requireAdmin();
  try {
    const ok = await fn();
    revalidatePath("/", "layout");
    return { ok };
  } catch (e) {
    if (e instanceof OpError) return { error: e.message };
    throw e;
  }
}

export async function approve(circleId: string, _prev: AdminState): Promise<AdminState> {
  return guard(async () => {
    await approveCircle(prisma, circleId);
    return "Approved. The circle is now raising from lenders.";
  });
}

export async function disburse(circleId: string, _prev: AdminState, formData: FormData): Promise<AdminState> {
  return guard(async () => {
    const r = await disburseCircle(prisma, {
      circleId,
      on: asDate(formData.get("on")),
      rail: new MockRail(),
      allowUnfunded: formData.get("allowUnfunded") === "on",
    });
    return `Disbursed ${r.loans} loans. Schedules created and 1.5% added to the reserve.`;
  });
}

export async function meeting(circleId: string, _prev: AdminState, formData: FormData): Promise<AdminState> {
  return guard(async () => {
    const loanIds = formData.getAll("loanId").map(String);
    const shillings = (k: string) => {
      const v = String(formData.get(k) ?? "").trim();
      if (v === "") return 0;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 0) throw new OpError("Payments must be whole shillings, zero or more.");
      return n * 100;
    };
    const entries = loanIds.map((loanId) => ({
      loanId,
      memberKesCents: shillings(`member:${loanId}`),
      circleKesCents: shillings(`circle:${loanId}`),
    }));
    const r = await recordMeeting(prisma, { circleId, on: asDate(formData.get("on")), fx: currentFx(), entries });
    return `Recorded KSh ${(r.collectedKes / 100).toLocaleString("en-US")} collected.`;
  });
}

export async function closeDefault(loanId: string, _prev: AdminState, formData: FormData): Promise<AdminState> {
  return guard(async () => {
    const note = String(formData.get("note") ?? "").trim();
    if (note.length < 5) throw new OpError("Write a short note on why the loan is being closed.");
    const r = await closeDefaultedLoan(prisma, { loanId, on: asDate(formData.get("on")), fx: currentFx(), note });
    return `Closed. Reserve covered KSh ${(r.reserveOut / 100).toLocaleString("en-US")}; lender loss KSh ${(r.lenderLoss / 100).toLocaleString("en-US")}.`;
  });
}
