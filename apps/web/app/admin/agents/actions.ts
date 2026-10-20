"use server";

import { prisma, revokeAllSessions } from "@kopa/db";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { normalizeKenyanPhone } from "@/lib/pii";
import { requireAdmin } from "@/lib/session";

export type AgentState = { error?: string; ok?: string };

const schema = z.object({
  name: z.string().trim().min(2, "Enter the agent's name.").max(60),
  phone: z.string().transform((v, ctx) => {
    const p = normalizeKenyanPhone(v);
    if (!p) ctx.addIssue({ code: "custom", message: "Enter a Kenyan mobile number." });
    return p ?? "";
  }),
  town: z.string().trim().min(2, "Enter the town they work in.").max(40),
  partnerId: z.string().min(1, "Choose the lending partner."),
});

export async function addAgent(_prev: AgentState, formData: FormData): Promise<AgentState> {
  await requireAdmin();
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message };
  const { name, phone, town, partnerId } = parsed.data;
  if (await prisma.user.findUnique({ where: { phone } })) return { error: "Someone already uses that phone number." };
  await prisma.user.create({ data: { name, phone, role: "AGENT", agent: { create: { town, partnerId } } } });
  revalidatePath("/admin/agents");
  return { ok: `${name} can now sign in with ${phone}.` };
}

/** Deactivating also signs the agent out on every device. */
export async function setAgentActive(userId: string, active: boolean) {
  await requireAdmin();
  await prisma.agent.update({ where: { userId }, data: { active } });
  if (!active) await revokeAllSessions(prisma, userId);
  revalidatePath("/admin/agents");
}
