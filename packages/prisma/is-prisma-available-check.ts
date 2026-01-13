import process from "node:process";

import { Prisma } from "./client";

export async function isPrismaAvailableCheck(): Promise<boolean> {
  // Skip database check if migrations are disabled or in build environments
  if (process.env.SKIP_DB_MIGRATIONS === "1" || process.env.VERCEL === "1" || process.env.CI === "true") {
    return false;
  }
  try {
    const { prisma } = await import("./index");

    await prisma.$queryRaw<unknown[]>(Prisma.sql`SELECT 1`);
    await prisma.$disconnect();
    return true;
  } catch (e: unknown) {
    // During builds, database may not be available - treat all errors as unavailable
    if (e instanceof Prisma.PrismaClientInitializationError) {
      return false;
    }
    // Catch network/connection errors that occur during build
    if (e instanceof Error && (e.message.includes("ENETUNREACH") || e.message.includes("connect"))) {
      return false;
    }
    // In build environments, be lenient and skip migrations on any error
    if (process.env.VERCEL === "1" || process.env.CI === "true") {
      return false;
    }
    throw e;
  }
}
