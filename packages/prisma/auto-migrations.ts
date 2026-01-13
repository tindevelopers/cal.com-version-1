import { exec as execCb } from "node:child_process";
import process from "node:process";
import { promisify } from "node:util";
import dotEnv from "dotenv";

import { isPrismaAvailableCheck } from "./is-prisma-available-check";

dotEnv.config({ path: "../../.env" });

const exec: (
  command: string,
  options?: { env?: NodeJS.ProcessEnv }
) => Promise<{ stdout: string; stderr: string }> = promisify(execCb);

/**
 * TODO: re-write this when Prisma.io gets a programmatic migration API
 * Thanks to @olalonde for the idea.
 * @see https://github.com/prisma/prisma/issues/4703#issuecomment-1447354363
 */
async function main(): Promise<void> {
  // Skip migrations in build environments (Vercel, CI) where database may not be available
  if (process.env.VERCEL === "1" || process.env.CI === "true") {
    console.info("Build environment detected, skipping migrations");
    return;
  }
  if (process.env.SKIP_DB_MIGRATIONS === "1") {
    console.info("SKIP_DB_MIGRATIONS set, skipping migrations");
    return;
  }
  if (!process.env.DATABASE_URL) {
    console.info("No DATABASE_URL found, skipping migrations");
    return;
  }
  if (!process.env.DATABASE_DIRECT_URL) {
    console.info("No DATABASE_DIRECT_URL found, skipping migrations");
    return;
  }
  if (!(await isPrismaAvailableCheck())) {
    console.info("Prisma can't be initialized, skipping migrations");
    return;
  }
  // throws an error if migration fails
  const { stdout, stderr } = await exec("yarn prisma migrate deploy", {
    env: {
      ...process.env,
    },
  });
  console.log(stdout);
  console.error(stderr);
}

main().catch((e) => {
  // During Vercel/CI builds, database may not be available - don't fail the build
  if (process.env.VERCEL === "1" || process.env.CI === "true") {
    console.info("Build environment detected, skipping migrations on error");
    console.info(e.stdout || e.stderr || e.message);
    process.exit(0);
  }
  console.error(e.stdout || e.stderr || e.message);
  process.exit(1);
});
