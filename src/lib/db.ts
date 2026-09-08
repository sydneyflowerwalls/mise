import { PrismaClient } from "@prisma/client";

// Next's dev server hot-reloads modules; without this the process accumulates
// Prisma clients until Postgres refuses new connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
