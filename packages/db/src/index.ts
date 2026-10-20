import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { attachDatabasePool } from "@vercel/functions";
import { Pool } from "pg";

export * from "@prisma/client";
export * from "./auth";
export * from "./messenger";
export * from "./ops";
export * from "./rail";

/**
 * The app's database client. Prisma runs over a node-postgres pool on the
 * pooled DATABASE_URL (Neon's "-pooler" host in production), and the pool is
 * attached to Vercel's function lifecycle so idle connections are released
 * before a function is suspended. Migrations use DATABASE_URL_UNPOOLED.
 */
function createClient() {
  // Keep full certificate checks explicit: pg v9 will weaken plain "require".
  const connectionString = process.env.DATABASE_URL?.replace("sslmode=require", "sslmode=verify-full");
  const pool = new Pool({ connectionString, max: 5 });
  attachDatabasePool(pool);
  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

// Reuse one client across Next.js dev hot reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? createClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
