import { createSession, prisma, verifyEmailLink } from "@kopa/db";
import { NextResponse, type NextRequest } from "next/server";
import { HOME, safeNext, sessionCookie } from "@/lib/session";

// The link in a sign-in email lands here: consume it, start a session, go home.
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const user = await verifyEmailLink(prisma, token);
  if (!user) return NextResponse.redirect(new URL("/signin?error=link", req.url));
  const raw = await createSession(prisma, user.id, { userAgent: req.headers.get("user-agent") });
  const next = safeNext(req.nextUrl.searchParams.get("next")) ?? HOME[user.role] ?? "/";
  const res = NextResponse.redirect(new URL(next, req.url));
  res.cookies.set(sessionCookie(raw));
  return res;
}
