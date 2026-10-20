import { prisma } from "@kopa/db";
import { cookies } from "next/headers";

// DEV ONLY: choose which agent you are with a cookie. Replace with Auth.js
// phone OTP (see docs/build-spec.md) before anyone outside the team uses this.
export const DEV_AGENT_COOKIE = "kopa_dev_agent";

export async function currentAgent() {
  const id = (await cookies()).get(DEV_AGENT_COOKIE)?.value;
  const include = { user: true, partner: true } as const;
  const chosen = id ? await prisma.agent.findUnique({ where: { userId: id }, include }) : null;
  if (chosen?.active) return chosen;
  return prisma.agent.findFirst({ where: { active: true }, orderBy: { town: "asc" }, include });
}

export async function requireAgent() {
  const agent = await currentAgent();
  if (!agent) throw new Error("No active agents. Run `pnpm db:seed` to load the sample agents.");
  return agent;
}
