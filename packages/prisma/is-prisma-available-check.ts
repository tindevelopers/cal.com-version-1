import process from "node:process";

import { Prisma } from "./client";

export async function isPrismaAvailableCheck(): Promise<boolean> {
  // Skip database check if migrations are disabled
  if (process.env.SKIP_DB_MIGRATIONS === "1") {
    return false;
  }
  try {
    const { prisma } = await import("./index");

    await prisma.$queryRaw<unknown[]>(Prisma.sql`SELECT 1`);
    await prisma.$disconnect();
    return true;
  } catch (e: unknown) {
    if (e instanceof Prisma.PrismaClientInitializationError) {
      return false;
    }
    throw e;
  }
}
