import { PrismaClient } from "@prisma/client";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  AuthError,
  createSession,
  MAX_CODES_PER_HOUR,
  requestEmailLink,
  requestSmsCode,
  revokeAllSessions,
  revokeSession,
  sessionUserId,
  verifyEmailLink,
  verifySmsCode,
} from "./auth";
import type { Messenger } from "./messenger";

// Integration tests against the dev Postgres. Rows use the "authtest" prefix.
const db = new PrismaClient();
const T = "authtest";
const PHONE = "+254799000111";

/** Captures what would have been sent. */
function inbox() {
  const sent: { to: string; text: string }[] = [];
  const m: Messenger = {
    async email(to, _s, text) {
      sent.push({ to, text });
    },
    async sms(to, text) {
      sent.push({ to, text });
    },
  };
  return { m, sent, last: () => sent[sent.length - 1]! };
}
const linkToken = (text: string) => new URL(text.match(/https?:\/\/\S+/)![0]).searchParams.get("token")!;
const smsCode = (text: string) => text.match(/\b(\d{6})\b/)![1]!;

async function cleanup() {
  const users = await db.user.findMany({ where: { OR: [{ id: { startsWith: T } }, { email: { startsWith: T } }] }, select: { id: true } });
  const ids = users.map((u) => u.id);
  await db.$transaction([
    db.session.deleteMany({ where: { userId: { in: ids } } }),
    db.loginCode.deleteMany({ where: { userId: { in: ids } } }),
    db.lender.deleteMany({ where: { userId: { in: ids } } }),
    db.agent.deleteMany({ where: { userId: { in: ids } } }),
    db.partner.deleteMany({ where: { id: `${T}-partner` } }),
    db.user.deleteMany({ where: { id: { in: ids } } }),
  ]);
}

beforeAll(async () => {
  await cleanup();
  await db.partner.create({ data: { id: `${T}-partner`, name: "Auth test partner", licenseType: "SACCO" } });
  await db.user.create({ data: { id: `${T}-agent`, phone: PHONE, role: "AGENT", agent: { create: { town: "Testville", partnerId: `${T}-partner` } } } });
});
afterAll(async () => {
  await cleanup();
  await db.$disconnect();
});

describe("email links", () => {
  it("signs a new lender up, works once, and expires", async () => {
    const { m, last } = inbox();
    await requestEmailLink(db, { email: ` ${T}-new@Example.com `, baseUrl: "http://localhost:3000", messenger: m });
    expect(last().to).toBe(`${T}-new@example.com`);
    const user = await db.user.findUniqueOrThrow({ where: { email: `${T}-new@example.com` }, include: { lender: true } });
    expect(user.role).toBe("LENDER");
    expect(user.lender).not.toBeNull();

    const tok = linkToken(last().text);
    expect((await verifyEmailLink(db, tok))?.id).toBe(user.id);
    expect(await verifyEmailLink(db, tok)).toBeNull(); // single use

    await requestEmailLink(db, { email: `${T}-new@example.com`, baseUrl: "http://localhost:3000", messenger: m });
    expect(await verifyEmailLink(db, linkToken(last().text), new Date(Date.now() + 16 * 60_000))).toBeNull(); // expired
    expect(await verifyEmailLink(db, "not-a-token")).toBeNull();
  });

  it("never stores the secret itself", async () => {
    const { m, last } = inbox();
    await requestEmailLink(db, { email: `${T}-stored@example.com`, baseUrl: "http://x", messenger: m });
    const tok = linkToken(last().text);
    expect(await db.loginCode.count({ where: { secretHash: { contains: tok } } })).toBe(0);
  });

  it("rate-limits requests per person", async () => {
    const { m } = inbox();
    const email = `${T}-busy@example.com`;
    for (let i = 0; i < MAX_CODES_PER_HOUR; i++) await requestEmailLink(db, { email, baseUrl: "http://x", messenger: m });
    await expect(requestEmailLink(db, { email, baseUrl: "http://x", messenger: m })).rejects.toThrow(AuthError);
  });

  it("refuses an agent's email and invalid addresses", async () => {
    await db.user.update({ where: { id: `${T}-agent` }, data: { email: `${T}-agent@example.com` } });
    const { m } = inbox();
    await expect(requestEmailLink(db, { email: `${T}-agent@example.com`, baseUrl: "http://x", messenger: m })).rejects.toThrow(/phone/);
    await expect(requestEmailLink(db, { email: "nope", baseUrl: "http://x", messenger: m })).rejects.toThrow(AuthError);
  });
});

describe("SMS codes", () => {
  it("lets an agent in with the right code, once", async () => {
    const { m, last } = inbox();
    await requestSmsCode(db, { phone: PHONE, messenger: m });
    const code = smsCode(last().text);
    expect((await verifySmsCode(db, { phone: PHONE, code })).id).toBe(`${T}-agent`);
    await expect(verifySmsCode(db, { phone: PHONE, code })).rejects.toThrow(AuthError);
  });

  it("burns the code after five wrong tries", async () => {
    const { m, last } = inbox();
    await requestSmsCode(db, { phone: PHONE, messenger: m });
    const code = smsCode(last().text);
    const wrong = code === "000000" ? "111111" : "000000";
    for (let i = 0; i < 5; i++) await expect(verifySmsCode(db, { phone: PHONE, code: wrong })).rejects.toThrow(AuthError);
    await expect(verifySmsCode(db, { phone: PHONE, code })).rejects.toThrow(AuthError);
  });

  it("sends nothing to unknown numbers and doesn't say so", async () => {
    const { m, sent } = inbox();
    await requestSmsCode(db, { phone: "+254700999999", messenger: m });
    expect(sent).toHaveLength(0);
    await expect(verifySmsCode(db, { phone: "+254700999999", code: "123456" })).rejects.toThrow(AuthError);
  });
});

describe("sessions", () => {
  it("resolves, expires and revokes", async () => {
    const raw = await createSession(db, `${T}-agent`, { userAgent: "test" });
    expect(await sessionUserId(db, raw)).toBe(`${T}-agent`);
    expect(await sessionUserId(db, raw, new Date(Date.now() + 31 * 24 * 3_600_000))).toBeNull();
    await revokeSession(db, raw);
    expect(await sessionUserId(db, raw)).toBeNull();

    const a = await createSession(db, `${T}-agent`);
    const b = await createSession(db, `${T}-agent`);
    await revokeAllSessions(db, `${T}-agent`);
    expect(await sessionUserId(db, a)).toBeNull();
    expect(await sessionUserId(db, b)).toBeNull();
    expect(await sessionUserId(db, undefined)).toBeNull();
  });
});
