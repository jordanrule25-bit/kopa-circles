import { prisma } from "@kopa/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

// DEV ONLY: a cookie picks which user you are. Replace with Auth.js (email
// magic link for lenders, phone OTP for agents) before anyone outside the
// team uses this. See docs/build-spec.md.
export const DEV_USER_COOKIE = "kopa_dev_user";

const include = { lender: true, agent: { include: { partner: true } } } as const;
export type SessionUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export async function currentUser() {
  const id = (await cookies()).get(DEV_USER_COOKIE)?.value;
  if (id) {
    const u = await prisma.user.findUnique({ where: { id }, include });
    if (u) return u;
  }
  return prisma.user.findFirst({ where: { role: "LENDER" }, orderBy: { id: "asc" }, include });
}

export async function requireRole<R extends "LENDER" | "AGENT" | "ADMIN">(role: R) {
  const u = await currentUser();
  if (!u || u.role !== role) redirect(`/switch?need=${role.toLowerCase()}`);
  return u as SessionUser & { role: R };
}

export async function requireAgent() {
  const u = await requireRole("AGENT");
  if (!u.agent?.active) throw new Error("This agent account is not active.");
  return u.agent;
}

export async function requireLender() {
  const u = await requireRole("LENDER");
  if (!u.lender) throw new Error("No lender profile.");
  return { ...u.lender, user: u };
}

export async function requireAdmin() {
  return requireRole("ADMIN");
}
