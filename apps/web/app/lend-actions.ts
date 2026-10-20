"use server";

import { circleFunding, lend, OpError, prisma } from "@kopa/db";
import { revalidatePath } from "next/cache";
import { currentFx } from "@/lib/fx";
import { requireLender } from "@/lib/session";

export type LendState = {
  error?: string;
  done?: {
    amountCents: number;
    tipCents: number;
    circleName: string;
    lenders: number;
    remainingCents: number;
    fullyFunded: boolean;
    balanceCents: number;
  };
};

/** Default tip, as in the prototype: 5% of the loan share, rounded to the cent. */
const TIP_BPS = 500;

export async function lendToCircle(circleId: string, _prev: LendState, formData: FormData): Promise<LendState> {
  const lender = await requireLender();
  const amountCents = Math.round(Number(formData.get("amount")) * 100);
  const tipCents = formData.get("tip") === "on" ? Math.round((amountCents * TIP_BPS) / 10_000) : 0;
  try {
    const r = await lend(prisma, { lenderId: lender.userId, circleId, amountCents, tipCents, fx: currentFx() });
    const [circle, lenders, funding, me] = await Promise.all([
      prisma.circle.findUniqueOrThrow({ where: { id: circleId }, select: { name: true } }),
      prisma.lenderShare.findMany({ where: { circleId }, distinct: ["lenderId"], select: { lenderId: true } }),
      circleFunding(prisma, circleId),
      prisma.lender.findUniqueOrThrow({ where: { userId: lender.userId }, select: { balanceCents: true } }),
    ]);
    revalidatePath("/", "layout");
    return {
      done: {
        amountCents,
        tipCents,
        circleName: circle.name,
        lenders: lenders.length,
        remainingCents: funding.remainingCents,
        fullyFunded: r.fullyFunded,
        balanceCents: me.balanceCents,
      },
    };
  } catch (e) {
    if (e instanceof OpError) return { error: e.message };
    throw e;
  }
}
