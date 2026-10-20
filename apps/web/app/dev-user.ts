"use server";

import { createSession, prisma, revokeSession } from "@kopa/db";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { devLoginEnabled, HOME, SESSION_COOKIE, sessionCookie } from "@/lib/session";

/** Development only: switch to any seeded account without a code. */
export async function switchDevUser(formData: FormData) {
  if (!devLoginEnabled()) throw new Error("Dev login is disabled.");
  const id = String(formData.get("user") ?? "");
  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) throw new Error("No such user.");
  const jar = await cookies();
  await revokeSession(prisma, jar.get(SESSION_COOKIE)?.value);
  jar.set(sessionCookie(await createSession(prisma, user.id, { userAgent: "dev switcher" })));
  redirect(HOME[user.role] ?? "/");
}
