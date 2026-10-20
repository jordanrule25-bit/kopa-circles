import type { PrismaClient } from "@prisma/client";

// Outbound email and SMS. Production uses Resend (email) and Africa's Talking
// (SMS) when their keys are set; development writes to the DevMessage table
// so you can read sign-in links and codes at /dev/outbox.

export interface Messenger {
  email(to: string, subject: string, text: string): Promise<void>;
  sms(to: string, text: string): Promise<void>;
}

export class DevOutbox implements Messenger {
  constructor(private db: PrismaClient) {}
  async email(to: string, subject: string, text: string) {
    await this.db.devMessage.create({ data: { channel: "EMAIL", to, subject, body: text } });
    console.log(`[dev outbox] email to ${to}: ${subject}\n${text}`);
  }
  async sms(to: string, text: string) {
    await this.db.devMessage.create({ data: { channel: "SMS", to, body: text } });
    console.log(`[dev outbox] sms to ${to}: ${text}`);
  }
}

async function resendEmail(apiKey: string, from: string, to: string, subject: string, text: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify({ from, to, subject, text }),
  });
  if (!res.ok) throw new Error(`Email failed: ${res.status} ${await res.text()}`);
}

async function africasTalkingSms(username: string, apiKey: string, to: string, text: string, from?: string) {
  const body = new URLSearchParams({ username, to, message: text, ...(from ? { from } : {}) });
  // The free sandbox account ("sandbox") has its own endpoint; texts show in its simulator.
  const host = username === "sandbox" ? "api.sandbox.africastalking.com" : "api.africastalking.com";
  const res = await fetch(`https://${host}/version1/messaging`, {
    method: "POST",
    headers: { apiKey, accept: "application/json", "content-type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`SMS failed: ${res.status} ${await res.text()}`);
  // A 201 can still report per-recipient failure (bad number, no credit).
  const reply = (await res.json().catch(() => null)) as { SMSMessageData?: { Recipients?: { status: string }[] } } | null;
  const recipient = reply?.SMSMessageData?.Recipients?.[0];
  if (!recipient || recipient.status !== "Success") throw new Error(`SMS not accepted: ${recipient?.status ?? "no recipient in response"}`);
}

/**
 * Picks real providers when configured. In production a missing provider is
 * an error rather than a silent fallback, so sign-in codes never go nowhere.
 */
export function messengerFromEnv(db: PrismaClient, env = process.env): Messenger {
  const dev = new DevOutbox(db);
  const prod = env.NODE_ENV === "production" && env.DEV_LOGIN !== "1";
  return {
    async email(to, subject, text) {
      if (env.RESEND_API_KEY && env.EMAIL_FROM) return resendEmail(env.RESEND_API_KEY, env.EMAIL_FROM, to, subject, text);
      if (prod) throw new Error("Email is not configured: set RESEND_API_KEY and EMAIL_FROM.");
      return dev.email(to, subject, text);
    },
    async sms(to, text) {
      if (env.AT_USERNAME && env.AT_API_KEY) return africasTalkingSms(env.AT_USERNAME, env.AT_API_KEY, to, text, env.AT_SENDER_ID);
      if (prod) throw new Error("SMS is not configured: set AT_USERNAME and AT_API_KEY.");
      return dev.sms(to, text);
    },
  };
}
