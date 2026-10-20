"use server";

import { memberLimit, MIN_LOAN_USD_CENTS, type LimitDecision } from "@kopa/core";
import { prisma, type Prisma } from "@kopa/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { CIRCLE_SIZE, MIN_QUALIFYING } from "@/lib/circle-rules";
import { currentFx } from "@/lib/fx";
import { limitFor } from "@/lib/limits";
import { hashPii, normalizeKenyanPhone, normalizeNationalId } from "@/lib/pii";
import { requireAgent } from "@/lib/session";

export type FormState = { error?: string; ok?: boolean };

const firstIssue = (e: z.ZodError) => e.issues[0]?.message ?? "Check the form and try again.";

async function ownCircle(circleId: string) {
  const agent = await requireAgent();
  const circle = await prisma.circle.findFirst({ where: { id: circleId, agentId: agent.userId } });
  if (!circle) throw new Error("Circle not found");
  return circle;
}

const circleSchema = z.object({
  name: z.string().trim().min(2, "Give the circle a name.").max(60),
  town: z.string().trim().min(2, "Enter the town.").max(40),
  sector: z.string().trim().min(2, "Choose a sector.").max(40),
  cycle: z.coerce.number().int().min(1, "Loan cycle starts at 1.").max(20),
  story: z.string().trim().min(20, "Write at least a sentence about the circle (20+ characters).").max(600),
});

export async function createCircle(_prev: FormState, formData: FormData): Promise<FormState> {
  const agent = await requireAgent();
  const parsed = circleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };

  const circle = await prisma.circle.create({
    data: { ...parsed.data, agentId: agent.userId, partnerId: agent.partnerId, status: "FORMING" },
  });
  redirect(`/agent/circles/${circle.id}`);
}

const memberSchema = z.object({
  name: z.string().trim().min(2, "Enter the member's name.").max(60),
  business: z.string().trim().min(2, "Enter the member's business.").max(60),
  phone: z.string().transform((v, ctx) => {
    const p = normalizeKenyanPhone(v);
    if (!p) ctx.addIssue({ code: "custom", message: "Enter a Kenyan mobile number, e.g. 0712 345 678." });
    return p ?? "";
  }),
  nationalId: z.string().transform((v, ctx) => {
    const id = normalizeNationalId(v);
    if (!id) ctx.addIssue({ code: "custom", message: "National ID should be 6 to 9 digits." });
    return id ?? "";
  }),
  weeklyInflowKes: z.coerce
    .number({ message: "Enter weekly inflow in shillings." })
    .int("Weekly inflow should be whole shillings.")
    .min(0)
    .max(10_000_000),
  activeLoans: z.coerce.number().int("Active loans should be a whole number.").min(0).max(50),
  consent: z.literal("on", { message: "The member must consent before they can be added." }),
});

export async function addMember(circleId: string, _prev: FormState, formData: FormData): Promise<FormState> {
  const circle = await ownCircle(circleId);
  if (circle.status !== "FORMING") return { error: "Members can only be added while the circle is forming." };

  const parsed = memberSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: firstIssue(parsed.error) };
  const d = parsed.data;

  const phoneHash = hashPii("phone", d.phone);
  const nationalIdHash = hashPii("nationalId", d.nationalId);

  const members = await prisma.member.findMany({ where: { circleId } });
  if (members.length >= CIRCLE_SIZE) return { error: `A circle has ${CIRCLE_SIZE} members.` };

  // One circle at a time per person.
  const elsewhere = await prisma.member.findFirst({
    where: {
      OR: [{ phoneHash }, { nationalIdHash }],
      circle: { status: { not: "COMPLETE" } },
    },
    include: { circle: true },
  });
  if (elsewhere) {
    return {
      error:
        elsewhere.circleId === circleId
          ? "This phone number or national ID is already in this circle."
          : `This person is already in an active circle (${elsewhere.circle.name}).`,
    };
  }

  const now = new Date();
  const member = await prisma.member.create({
    data: {
      circleId,
      name: d.name,
      business: d.business,
      phoneHash,
      nationalIdHash,
      consentAt: now,
      scoreInputs: {
        create: {
          source: "AGENT",
          weeklyInflowKesCents: d.weeklyInflowKes * 100,
          activeLoans: d.activeLoans,
          capturedAt: now,
        },
      },
    },
  });
  revalidatePath(`/agent/circles/${circleId}`);
  redirect(`/agent/circles/${circleId}?added=${member.id}`);
}

/** Live limit preview while the agent types. The math stays in @kopa/core. */
export async function previewLimit(circleId: string, weeklyInflowKes: number, activeLoans: number): Promise<LimitDecision | null> {
  const circle = await ownCircle(circleId);
  if (![weeklyInflowKes, activeLoans].every((v) => Number.isInteger(v) && v >= 0 && v <= 10_000_000)) return null;
  return memberLimit(circle.cycle, weeklyInflowKes * 100, activeLoans, currentFx());
}

export async function removeMember(circleId: string, memberId: string) {
  const circle = await ownCircle(circleId);
  if (circle.status !== "FORMING") throw new Error("Members can only be removed while the circle is forming.");
  // Nothing has been listed yet, so there are no loans or ledger events to keep.
  await prisma.$transaction([
    prisma.scoreInput.deleteMany({ where: { memberId, member: { circleId } } }),
    prisma.member.deleteMany({ where: { id: memberId, circleId } }),
  ]);
  revalidatePath(`/agent/circles/${circleId}`);
}

export async function submitForListing(circleId: string, _prev: FormState): Promise<FormState> {
  const circle = await ownCircle(circleId);
  if (circle.status !== "FORMING") return { error: "This circle has already been submitted." };

  const fx = currentFx();
  const members = await prisma.member.findMany({ where: { circleId }, include: { scoreInputs: true } });
  if (members.length !== CIRCLE_SIZE) return { error: `Add all ${CIRCLE_SIZE} members first.` };
  if (members.some((m) => !m.consentAt)) return { error: "Every member must consent first." };

  const decisions = members.map((m) => ({ member: m, decision: limitFor(circle.cycle, m.scoreInputs, fx) }));
  const approved = decisions.flatMap(({ member, decision }) =>
    decision?.status === "APPROVED" && decision.amountUsdCents >= MIN_LOAN_USD_CENTS ? [{ member, decision }] : [],
  );
  if (approved.length < MIN_QUALIFYING) {
    return { error: `Only ${approved.length} of ${CIRCLE_SIZE} members qualify. A circle needs at least ${MIN_QUALIFYING}.` };
  }

  await prisma.$transaction(async (tx) => {
    // Guard against a double submit racing past the status check above.
    const { count } = await tx.circle.updateMany({ where: { id: circleId, status: "FORMING" }, data: { status: "SUBMITTED" } });
    if (count !== 1) throw new Error("This circle has already been submitted.");

    for (const { member, decision } of approved) {
      const loan = await tx.loan.create({
        data: {
          memberId: member.id,
          circleId,
          principalKesCents: decision.amountKesCents,
          listedUsdCents: decision.amountUsdCents,
          status: "LISTED",
        },
      });
      const meta: Prisma.InputJsonValue = {
        amountUsdCents: decision.amountUsdCents,
        installmentKesCents: decision.installmentKesCents,
        limitedBy: decision.limitedBy,
        fxRate: fx.kesPerUsd,
      };
      await tx.ledgerEvent.create({
        data: { kind: "LOAN_LISTED", loanId: loan.id, circleId, amountMinor: decision.amountKesCents, currency: "KES", meta },
      });
    }
  });

  revalidatePath("/agent");
  revalidatePath(`/agent/circles/${circleId}`);
  return { ok: true };
}
