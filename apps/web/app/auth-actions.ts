"use server";

import { AuthError, createSession, messengerFromEnv, prisma, requestEmailLink, requestSmsCode, revokeSession, verifySmsCode } from "@kopa/db";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { normalizeKenyanPhone } from "@/lib/pii";
import { CLEAR_PAGES_COOKIE, SESSION_COOKIE, safeNext, sessionCookie } from "@/lib/session";

export type AuthState = { error?: string; phone?: string; sent?: boolean };

async function baseUrl() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return process.env.APP_URL ?? `${proto}://${host}`;
}

export async function requestLink(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const email = String(formData.get("email") ?? "");
  const next = safeNext(String(formData.get("next") ?? "")) ?? undefined;
  try {
    await requestEmailLink(prisma, { email, baseUrl: await baseUrl(), messenger: messengerFromEnv(prisma), next });
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message };
    throw e;
  }
  redirect(`/signin/check-email?email=${encodeURIComponent(email.trim().toLowerCase())}`);
}

export async function requestCode(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const phone = normalizeKenyanPhone(String(formData.get("phone") ?? ""));
  if (!phone) return { error: "Enter a Kenyan mobile number, e.g. 0712 345 678." };
  try {
    await requestSmsCode(prisma, { phone, messenger: messengerFromEnv(prisma) });
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message, phone };
    throw e;
  }
  return { sent: true, phone };
}

export async function verifyCode(_prev: AuthState, formData: FormData): Promise<AuthState> {
  const phone = normalizeKenyanPhone(String(formData.get("phone") ?? ""));
  const code = String(formData.get("code") ?? "").replace(/\s/g, "");
  if (!phone) return { error: "Start again with your phone number." };
  try {
    const user = await verifySmsCode(prisma, { phone, code });
    const raw = await createSession(prisma, user.id, { userAgent: (await headers()).get("user-agent") });
    (await cookies()).set(sessionCookie(raw));
  } catch (e) {
    if (e instanceof AuthError) return { error: e.message, phone, sent: true };
    throw e;
  }
  redirect("/agent");
}

export async function signOut() {
  const jar = await cookies();
  await revokeSession(prisma, jar.get(SESSION_COOKIE)?.value);
  jar.delete(SESSION_COOKIE);
  // One-time marker: the next page clears pages cached for offline use on this device.
  jar.set({ name: CLEAR_PAGES_COOKIE, value: "1", path: "/", sameSite: "lax", maxAge: 300 });
  redirect("/");
}
