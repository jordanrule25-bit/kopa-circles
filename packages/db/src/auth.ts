// Passwordless sign-in: email links for lenders and admins, SMS codes for
// field agents. Secrets are random, single-use and short-lived, and only
// their HMAC is stored. Sessions are database rows so they can be revoked.
import { createHmac, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import type { PrismaClient, User } from "@prisma/client";
import type { Messenger } from "./messenger";

export const LINK_TTL_MS = 15 * 60_000;
export const CODE_TTL_MS = 10 * 60_000;
export const SESSION_TTL_MS = 30 * 24 * 60 * 60_000;
export const MAX_CODE_ATTEMPTS = 5;
/** Per user, per hour, across email and SMS. */
export const MAX_CODES_PER_HOUR = 5;

export class AuthError extends Error {}

function secret(): string {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set to at least 32 random characters.");
  return s;
}
const mac = (value: string) => createHmac("sha256", secret()).update(value).digest("hex");
const token = () => randomBytes(32).toString("base64url");

async function underRateLimit(db: PrismaClient, userId: string, now: Date) {
  const recent = await db.loginCode.count({ where: { userId, createdAt: { gt: new Date(now.getTime() - 3_600_000) } } });
  if (recent >= MAX_CODES_PER_HOUR) throw new AuthError("Too many sign-in attempts. Try again in an hour.");
}

export const normalizeEmail = (raw: string) => raw.trim().toLowerCase();
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Emails a sign-in link. Lenders sign up this way: an unknown email becomes a
 * new lender. Agents sign in by phone, so an agent's email is refused.
 */
export async function requestEmailLink(
  db: PrismaClient,
  opts: { email: string; baseUrl: string; messenger: Messenger; next?: string; now?: Date },
) {
  const now = opts.now ?? new Date();
  const email = normalizeEmail(opts.email);
  if (!EMAIL.test(email)) throw new AuthError("Enter a valid email address.");

  let user = await db.user.findUnique({ where: { email } });
  if (!user) {
    user = await db.user.create({ data: { email, role: "LENDER", lender: { create: {} } } });
  }
  if (user.role === "AGENT") throw new AuthError("Field agents sign in with their phone number.");
  await underRateLimit(db, user.id, now);

  const secretValue = token();
  await db.loginCode.create({
    data: { userId: user.id, channel: "EMAIL", secretHash: mac(`link:${secretValue}`), expiresAt: new Date(now.getTime() + LINK_TTL_MS) },
  });
  const url = new URL("/auth/verify", opts.baseUrl);
  url.searchParams.set("token", secretValue);
  if (opts.next) url.searchParams.set("next", opts.next);
  await opts.messenger.email(
    email,
    "Your Kopa Circles sign-in link",
    `Sign in to Kopa Circles:\n\n${url.toString()}\n\nThis link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.`,
  );
}

/** Consumes an email link. Returns the user, or null if it's invalid, used or expired. */
export async function verifyEmailLink(db: PrismaClient, secretValue: string, now = new Date()): Promise<User | null> {
  if (!secretValue) return null;
  const row = await db.loginCode.findFirst({ where: { channel: "EMAIL", secretHash: mac(`link:${secretValue}`) }, include: { user: true } });
  if (!row || row.usedAt || row.expiresAt <= now) return null;
  const { count } = await db.loginCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
  return count === 1 ? row.user : null;
}

/**
 * Texts a six-digit code to an agent's phone. Says nothing about whether the
 * number is registered, so the form can't be used to discover agents.
 */
export async function requestSmsCode(db: PrismaClient, opts: { phone: string; messenger: Messenger; now?: Date }) {
  const now = opts.now ?? new Date();
  const user = await db.user.findUnique({ where: { phone: opts.phone }, include: { agent: true } });
  if (!user || user.role !== "AGENT" || !user.agent?.active) return;
  await underRateLimit(db, user.id, now);
  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  await db.loginCode.create({
    data: { userId: user.id, channel: "SMS", secretHash: mac(`code:${user.id}:${code}`), expiresAt: new Date(now.getTime() + CODE_TTL_MS) },
  });
  await opts.messenger.sms(opts.phone, `Your Kopa Circles code is ${code}. It expires in 10 minutes. Never share it.`);
}

/** Checks an agent's code against their latest unused one. Five wrong tries burn it. */
export async function verifySmsCode(db: PrismaClient, opts: { phone: string; code: string; now?: Date }): Promise<User> {
  const now = opts.now ?? new Date();
  const fail = new AuthError("That code didn't work. Check it, or ask for a new one.");
  const user = await db.user.findUnique({ where: { phone: opts.phone }, include: { agent: true } });
  if (!user || user.role !== "AGENT" || !user.agent?.active || !/^\d{6}$/.test(opts.code)) throw fail;

  const row = await db.loginCode.findFirst({
    where: { userId: user.id, channel: "SMS", usedAt: null, expiresAt: { gt: now }, attempts: { lt: MAX_CODE_ATTEMPTS } },
    orderBy: { createdAt: "desc" },
  });
  if (!row) throw fail;
  const expected = Buffer.from(row.secretHash, "hex");
  const given = Buffer.from(mac(`code:${user.id}:${opts.code}`), "hex");
  if (!timingSafeEqual(expected, given)) {
    await db.loginCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    throw fail;
  }
  const { count } = await db.loginCode.updateMany({ where: { id: row.id, usedAt: null }, data: { usedAt: now } });
  if (count !== 1) throw fail;
  return user;
}

/** Starts a session and returns the raw token for the cookie. */
export async function createSession(db: PrismaClient, userId: string, opts: { userAgent?: string | null; now?: Date } = {}) {
  const now = opts.now ?? new Date();
  const raw = token();
  await db.session.create({
    data: { userId, tokenHash: mac(`session:${raw}`), expiresAt: new Date(now.getTime() + SESSION_TTL_MS), userAgent: opts.userAgent?.slice(0, 200) ?? null },
  });
  return raw;
}

export async function sessionUserId(db: PrismaClient, raw: string | undefined, now = new Date()): Promise<string | null> {
  if (!raw) return null;
  const s = await db.session.findUnique({ where: { tokenHash: mac(`session:${raw}`) } });
  if (!s || s.revokedAt || s.expiresAt <= now) return null;
  return s.userId;
}

export async function revokeSession(db: PrismaClient, raw: string | undefined, now = new Date()) {
  if (!raw) return;
  await db.session.updateMany({ where: { tokenHash: mac(`session:${raw}`), revokedAt: null }, data: { revokedAt: now } });
}

/** Signs someone out everywhere, e.g. when an agent's phone is lost. */
export async function revokeAllSessions(db: PrismaClient, userId: string, now = new Date()) {
  await db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: now } });
}
