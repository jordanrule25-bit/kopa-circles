// Creates (or promotes) an admin who signs in by email link.
// Usage: pnpm --filter @kopa/db create-admin you@example.com "Your Name"
import { PrismaClient } from "@prisma/client";
import { normalizeEmail } from "./auth";

const [rawEmail, name] = process.argv.slice(2);
if (!rawEmail) {
  console.error('Usage: pnpm --filter @kopa/db create-admin you@example.com "Your Name"');
  process.exit(1);
}
const email = normalizeEmail(rawEmail);
const prisma = new PrismaClient();
const user = await prisma.user.upsert({
  where: { email },
  create: { email, name: name ?? null, role: "ADMIN" },
  update: { role: "ADMIN", ...(name ? { name } : {}) },
});
console.log(`${user.email} is an admin. They sign in at /signin with this email.`);
await prisma.$disconnect();
