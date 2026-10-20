"use server";

import { lend, OpError, prisma } from "@kopa/db";
import { revalidatePath } from "next/cache";
import { currentFx } from "@/lib/fx";
import { requireLender } from "@/lib/session";

export type LendState = { error?: string; ok?: string };

/** Default tip, as in the prototype: 5% of the loan share, rounded to the cent. */
const TIP_BPS = 500;

export async function lendToCircle(circleId: string, _prev: LendState, formData: FormData): Promise<LendState> {
  const lender = await requireLender();
  const amountCents = Math.round(Number(formData.get("amount")) * 100);
  const tip = formData.get("tip") === "on";
  const tipCents = tip ? Math.round((amountCents * TIP_BPS) / 10_000) : 0;
  try {
    const r = await lend(prisma, { lenderId: lender.userId, circleId, amountCents, tipCents, fx: currentFx() });
    revalidatePath("/", "layout");
    return { ok: r.fullyFunded ? "Thank you. This circle is now fully funded." : "Thank you. Your loan share is in." };
  } catch (e) {
    if (e instanceof OpError) return { error: e.message };
    throw e;
  }
}
