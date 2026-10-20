import { createSession, prisma } from "@kopa/db";
import { NextResponse, type NextRequest } from "next/server";
import { devLoginEnabled, HOME, safeNext, sessionCookie } from "@/lib/session";

// Development and tests only: start a session as any seeded user.
export async function GET(req: NextRequest) {
  if (!devLoginEnabled()) return new NextResponse("Not found", { status: 404 });
  const user = await prisma.user.findUnique({ where: { id: req.nextUrl.searchParams.get("user") ?? "" } });
  if (!user) return new NextResponse("No such user", { status: 404 });
  const raw = await createSession(prisma, user.id, { userAgent: "dev login" });
  const res = NextResponse.redirect(new URL(safeNext(req.nextUrl.searchParams.get("next")) ?? HOME[user.role] ?? "/", req.url));
  res.cookies.set(sessionCookie(raw));
  return res;
}
