import { createHash } from "node:crypto";

/** Kenyan mobile numbers: 07XXXXXXXX, 01XXXXXXXX, 2547..., +2547... -> +2547XXXXXXXX */
export function normalizeKenyanPhone(raw: string): string | null {
  const digits = raw.replace(/[\s-]/g, "");
  const m = /^(?:\+?254|0)([17]\d{8})$/.exec(digits);
  return m ? `+254${m[1]}` : null;
}

export function normalizeNationalId(raw: string): string | null {
  const id = raw.replace(/\s/g, "");
  return /^\d{6,9}$/.test(id) ? id : null;
}

/** We store only salted hashes of phone numbers and national IDs. */
export function hashPii(kind: "phone" | "nationalId", value: string): string {
  const salt = process.env.PII_HASH_SALT;
  if (!salt) throw new Error("PII_HASH_SALT is not set");
  if (process.env.NODE_ENV === "production" && salt.includes("dev-only")) throw new Error("PII_HASH_SALT is still the development value.");
  return createHash("sha256").update(`${salt}:${kind}:${value}`).digest("hex");
}
