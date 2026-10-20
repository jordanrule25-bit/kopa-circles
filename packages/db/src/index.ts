import { PrismaClient } from "@prisma/client";

export * from "@prisma/client";
export * from "./ops";
export * from "./rail";

// Reuse one client across Next.js dev hot reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
