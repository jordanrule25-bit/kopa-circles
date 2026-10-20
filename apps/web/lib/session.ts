import { prisma, sessionUserId } from "@kopa/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const SESSION_COOKIE = "kopa_session";
export const SESSION_MAX_AGE = 30 * 24 * 60 * 60;

export const sessionCookie = (value: string) => ({
  name: SESSION_COOKIE,
  value,
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  path: "/",
  maxAge: SESSION_MAX_AGE,
});

/** The account switcher and dev outbox. Never available in a production build. */
export const devLoginEnabled = () => process.env.DEV_LOGIN === "1" && process.env.NODE_ENV !== "production";

const include = { lender: true, agent: { include: { partner: true } } } as const;
export type SessionUser = NonNullable<Awaited<ReturnType<typeof currentUser>>>;

export async function currentUser() {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  const id = await sessionUserId(prisma, raw);
  return id ? prisma.user.findUnique({ where: { id }, include }) : null;
}

export async function requireRole<R extends "LENDER" | "AGENT" | "ADMIN">(role: R) {
  const u = await currentUser();
  if (!u) redirect(role === "AGENT" ? "/signin/agent" : `/signin?need=${role.toLowerCase()}`);
  if (u.role !== role) redirect(`/switch?need=${role.toLowerCase()}`);
  return u as SessionUser & { role: R };
}

export async function requireAgent() {
  const u = await requireRole("AGENT");
  if (!u.agent?.active) redirect("/switch?need=agent");
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

export const HOME: Record<string, string> = { LENDER: "/portfolio", AGENT: "/agent", ADMIN: "/admin", PARTNER: "/" };

/** Only same-site relative paths, so a sign-in link can't bounce someone to another site. */
export function safeNext(next: string | null | undefined): string | null {
  return next && next.startsWith("/") && !next.startsWith("//") && !next.startsWith("/\\") ? next : null;
}
