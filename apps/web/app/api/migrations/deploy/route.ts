import process from "node:process";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

/**
 * Validates the authorization token from the request
 */
function validateAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const expectedToken = process.env.MIGRATION_SECRET_TOKEN;

  if (!expectedToken) {
    return NextResponse.json({ error: "MIGRATION_SECRET_TOKEN not configured" }, { status: 500 });
  }

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Missing or invalid authorization header" }, { status: 401 });
  }

  const token = authHeader.replace("Bearer ", "");
  if (token !== expectedToken) {
    return NextResponse.json({ error: "Invalid token" }, { status: 403 });
  }

  return null;
}

/**
 * Validates database configuration
 */
function validateDatabaseConfig(): NextResponse | null {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ error: "DATABASE_URL not configured" }, { status: 500 });
  }

  if (!process.env.DATABASE_DIRECT_URL) {
    return NextResponse.json({ error: "DATABASE_DIRECT_URL not configured" }, { status: 500 });
  }

  return null;
}

/**
 * Extracts error information from an unknown error
 */
function extractErrorInfo(error: unknown): {
  message: string;
  stdout?: string;
  stderr?: string;
} {
  let errorMessage = "Unknown error";
  if (error instanceof Error) {
    errorMessage = error.message;
  }

  let errorStdout: string | undefined;
  if (error && typeof error === "object" && "stdout" in error) {
    errorStdout = String(error.stdout);
  }

  let errorStderr: string | undefined;
  if (error && typeof error === "object" && "stderr" in error) {
    errorStderr = String(error.stderr);
  }

  return { message: errorMessage, stdout: errorStdout, stderr: errorStderr };
}

/**
 * API route to run database migrations separately from the build process.
 * This should be called manually or via a deployment hook after the build completes.
 *
 * Security: This endpoint should be protected with authentication in production.
 * For Vercel deployments, consider using Vercel's deployment hooks or a cron job.
 *
 * Usage:
 * - POST /api/migrations/deploy
 * - Headers: Authorization: Bearer <your-secret-token>
 *
 * Environment variables:
 * - MIGRATION_SECRET_TOKEN: Secret token to authenticate migration requests
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  const authError = validateAuth(request);
  if (authError) {
    return authError;
  }

  const configError = validateDatabaseConfig();
  if (configError) {
    return configError;
  }

  try {
    // Run migrations using Prisma migrate deploy
    // This is safe for production as it only applies pending migrations
    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);

    // Convert all environment variables to strings for execAsync
    // PAYMENT_FEE_PERCENTAGE is typed as number but needs to be a string for ProcessEnv
    // Also trim any trailing newlines/whitespace that might cause issues
    // biome-ignore lint/suspicious/noExplicitAny: process.env can contain non-string values
    const env: { [key: string]: string } = {};
    for (const key in process.env) {
      if (Object.prototype.hasOwnProperty.call(process.env, key)) {
        const value = process.env[key];
        if (value !== undefined) {
          // Trim trailing newlines and whitespace that might cause issues
          env[key] = String(value).trimEnd();
        }
      }
    }
    // Override DATABASE_URL with DATABASE_DIRECT_URL if available
    const databaseUrl = process.env.DATABASE_DIRECT_URL || process.env.DATABASE_URL;
    if (databaseUrl) {
      env.DATABASE_URL = String(databaseUrl).trimEnd();
    }

    const { stdout, stderr } = await execAsync("yarn workspace @calcom/prisma db-deploy", {
      env: env as NodeJS.ProcessEnv,
      cwd: process.cwd(),
    });

    return NextResponse.json({
      success: true,
      message: "Migrations deployed successfully",
      stdout,
      stderr,
    });
  } catch (error: unknown) {
    const { message, stdout, stderr } = extractErrorInfo(error);

    console.error("Migration deployment failed:", {
      error: message,
      stdout,
      stderr,
    });

    return NextResponse.json(
      {
        error: "Migration deployment failed",
        message,
        stdout,
        stderr,
      },
      { status: 500 }
    );
  }
}

// Allow GET for health check (without running migrations)
export async function GET(): Promise<NextResponse> {
  return NextResponse.json({
    status: "ok",
    message: "Migration endpoint is available. Use POST with Authorization header to run migrations.",
  });
}
