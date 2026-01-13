#!/usr/bin/env node
/**
 * Build wrapper script with instrumentation for Vercel builds
 * Logs key information to help debug build failures
 */

import process from "node:process";
import { execSync, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const LOG_FILE = path.join(__dirname, "../.cursor/debug.log");
const SESSION_ID = `vercel-build-${Date.now()}`;
const RUN_ID = `build-${Date.now()}`;
const REPO_ROOT = path.resolve(__dirname, "..");

let turboStartTime = null;

// #region agent log
function postDebug(hypothesisId, location, message, data) {
  // NOTE: This endpoint exists only in our local debug environment.
  // On Vercel it will fail fast and be ignored.
  fetch("http://127.0.0.1:7247/ingest/775288a5-8379-4f47-bb7e-30dbdf7e5db9", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: "debug-session",
      runId: RUN_ID,
      hypothesisId,
      location,
      message,
      data,
      timestamp: Date.now(),
    }),
  }).catch(() => {});
}
// #endregion

// Helper function to log JSON to file
function logJson(message, data, hypothesisId = "general") {
  const logEntry = {
    sessionId: SESSION_ID,
    runId: RUN_ID,
    hypothesisId,
    location: `vercel-build.js:${new Error().stack.split("\n")[1]?.trim() || "unknown"}`,
    message,
    data: typeof data === "string" ? JSON.parse(data) : data,
    timestamp: Date.now(),
  };

  // Always log to stdout so it's visible in Vercel build logs
  // (File logging may not be available on Vercel build machines)
  console.log(`[agent-log] ${JSON.stringify(logEntry)}`);

  // Best-effort file logging (useful locally)
  try {
    const logDir = path.dirname(LOG_FILE);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    fs.appendFileSync(LOG_FILE, `${JSON.stringify(logEntry)}\n`);
  } catch (_e) {
    // ignore
  }
}

(async () => {
try {
  // Log build start
  // #region agent log
  postDebug("A", "scripts/vercel-build-with-logging.js:buildStart", "Build start (env summary)", {
    VERCEL: process.env.VERCEL || "not-set",
    VERCEL_ENV: process.env.VERCEL_ENV || "not-set",
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA || "not-set",
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF || "not-set",
    NODE_ENV: process.env.NODE_ENV || "not-set",
    CSP_POLICY: process.env.CSP_POLICY || "not-set",
    NODE_OPTIONS: process.env.NODE_OPTIONS || "not-set",
    has_NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
    has_CALENDSO_ENCRYPTION_KEY: Boolean(process.env.CALENDSO_ENCRYPTION_KEY),
  });
  // #endregion

  logJson(
    "Build started",
    {
      repoRoot: REPO_ROOT,
      pwd: process.cwd(),
      user: process.env.USER || process.env.USERNAME || "unknown",
      nodeVersion: process.version,
      platform: process.platform,
      arch: process.arch,
      vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ? "set" : "not-set",
      vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || "not-set",
    },
    "A"
  );

  // Log environment variables (non-sensitive)
  logJson(
    "Environment check",
    {
      VERCEL: process.env.VERCEL || "not-set",
      VERCEL_ENV: process.env.VERCEL_ENV || "not-set",
      NODE_ENV: process.env.NODE_ENV || "not-set",
      CI: process.env.CI || "not-set",
      BUILD_STANDALONE: process.env.BUILD_STANDALONE || "not-set",
      ROOT_DIRECTORY: process.env.VERCEL_ROOT_DIRECTORY || "not-set",
      VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ? "set" : "not-set",
      VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF || "not-set",
      CSP_POLICY: process.env.CSP_POLICY || "not-set",
      NODE_OPTIONS: process.env.NODE_OPTIONS || "not-set",
      has_NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
      has_CALENDSO_ENCRYPTION_KEY: Boolean(process.env.CALENDSO_ENCRYPTION_KEY),
    },
    "B"
  );

  // Log filesystem state
  const rootPackageJsonExists = fs.existsSync(path.join(REPO_ROOT, "package.json"));
  const turboJsonExists = fs.existsSync(path.join(REPO_ROOT, "turbo.json"));
  const appsWebExists = fs.existsSync(path.join(REPO_ROOT, "apps/web"));
  const packagesExists = fs.existsSync(path.join(REPO_ROOT, "packages"));

  logJson(
    "Filesystem check",
    {
      rootPackageJsonExists,
      turboJsonExists,
      appsWebExists,
      packagesExists,
      workingDir: process.cwd(),
      repoRoot: REPO_ROOT,
    },
    "C"
  );

  // Capture package manager + Next.js version + Yarn linker
  let packageManager = "unknown";
  let nodeLinker = "unknown";
  let nextVersion = "unknown";
  try {
    const rootPkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "package.json"), "utf8"));
    packageManager = rootPkg.packageManager || "missing";
  } catch (_e) {
    packageManager = "read-error";
  }

  try {
    const yarnrc = fs.readFileSync(path.join(REPO_ROOT, ".yarnrc.yml"), "utf8");
    const matcher = yarnrc.match(/nodeLinker:\s*([^\s#]+)/);
    nodeLinker = matcher?.[1] || "not-found";
  } catch (_e) {
    nodeLinker = "read-error";
  }

  try {
    const webPkg = JSON.parse(fs.readFileSync(path.join(REPO_ROOT, "apps/web/package.json"), "utf8"));
    nextVersion = webPkg.dependencies?.next || webPkg.devDependencies?.next || "missing";
  } catch (_e) {
    nextVersion = "read-error";
  }

  // #region agent log
  logJson(
    "Package tooling snapshot",
    {
      packageManager,
      nodeLinker,
      nextVersion,
    },
    "H1"
  );
  // #endregion

  // Presence-only (no values) for critical envs
  // #region agent log
  logJson(
    "Env presence snapshot",
    {
      has_DATABASE_URL: Boolean(process.env.DATABASE_URL),
      has_DATABASE_DIRECT_URL: Boolean(process.env.DATABASE_DIRECT_URL),
      has_SHADOW_DATABASE_URL: Boolean(process.env.SHADOW_DATABASE_URL),
      has_NEXTAUTH_URL: Boolean(process.env.NEXTAUTH_URL),
      has_NEXT_PUBLIC_WEBAPP_URL: Boolean(process.env.NEXT_PUBLIC_WEBAPP_URL),
      has_STRIPE_SECRET_KEY: Boolean(process.env.STRIPE_SECRET_KEY),
    },
    "H2"
  );
  // #endregion

  // Get yarn and turbo versions
  let yarnVersion = "unknown";
  let turboVersion = "unknown";
  try {
    yarnVersion = execSync("yarn --version", { encoding: "utf8", stdio: "pipe" }).trim();
  } catch (e) {
    yarnVersion = "error";
  }
  try {
    turboVersion = execSync("turbo --version", { encoding: "utf8", stdio: "pipe" }).trim();
  } catch (e) {
    turboVersion = "error";
  }

  logJson(
    "Tool versions",
    {
      yarnVersion,
      turboVersion,
    },
    "D"
  );

  // Log before turbo command
  const buildCommand = "turbo run build --filter=@calcom/web...";
  logJson(
    "Before turbo build",
    {
      command: buildCommand,
      workingDir: process.cwd(),
      repoRoot: REPO_ROOT,
    },
    "E"
  );

  turboStartTime = Date.now();
  // #region agent log
  logJson(
    "Turbo build start",
    {
      command: buildCommand,
      startTime: turboStartTime,
    },
    "H3"
  );
  // #endregion

  // Execute the actual build command with output capture and heartbeat
  console.log("Executing:", buildCommand);
  
  let lastOutputTime = Date.now();
  let lastHeartbeatTime = Date.now();
  const HEARTBEAT_INTERVAL_MS = 30000; // 30 seconds
  const STUCK_THRESHOLD_MS = 300000; // 5 minutes
  let outputBuffer = "";
  let lastOutputLine = "";
  
  await new Promise((resolve, reject) => {
    const child = spawn(buildCommand, {
      cwd: REPO_ROOT,
      stdio: ["inherit", "pipe", "pipe"],
      shell: true,
    });

    // Heartbeat timer to detect if build is stuck
    const heartbeatInterval = setInterval(() => {
      const now = Date.now();
      const timeSinceLastOutput = now - lastOutputTime;
      const timeSinceStart = now - turboStartTime;
      
      logJson(
        "Build heartbeat",
        {
          timeSinceStartMs: timeSinceStart,
          timeSinceLastOutputMs: timeSinceLastOutput,
          lastOutputLine: lastOutputLine.substring(0, 200), // Truncate long lines
          isStuck: timeSinceLastOutput > STUCK_THRESHOLD_MS,
        },
        "H4"
      );
      
      if (timeSinceLastOutput > STUCK_THRESHOLD_MS) {
        logJson(
          "Build appears stuck - no output for 5+ minutes",
          {
            timeSinceStartMs: timeSinceStart,
            timeSinceLastOutputMs: timeSinceLastOutput,
            lastOutputLine,
          },
          "H5"
        );
        // Don't kill the process automatically - let Vercel handle timeouts
        // But log a warning that might help diagnose the issue
        console.error(
          "\n⚠️  WARNING: Build appears stuck - no output for 5+ minutes.\n" +
          "This may be caused by:\n" +
          "1. Turbopack hanging (try disabling it)\n" +
          "2. Memory issues (check NODE_OPTIONS)\n" +
          "3. Large bundle compilation taking too long\n" +
          "4. Circular dependencies or infinite loops\n"
        );
      }
    }, HEARTBEAT_INTERVAL_MS);

    // Capture stdout
    child.stdout.on("data", (data) => {
      const output = data.toString();
      outputBuffer += output;
      lastOutputTime = Date.now();
      
      // Extract last line for logging
      const lines = output.split("\n").filter((l) => l.trim());
      if (lines.length > 0) {
        lastOutputLine = lines[lines.length - 1];
      }
      
      // Log every 100 lines or every 2 minutes
      const linesCount = outputBuffer.split("\n").length;
      if (linesCount % 100 === 0 || Date.now() - lastHeartbeatTime > 120000) {
        logJson(
          "Build output progress",
          {
            totalLines: linesCount,
            lastOutputLine: lastOutputLine.substring(0, 200),
            timeSinceStartMs: Date.now() - turboStartTime,
          },
          "H6"
        );
        lastHeartbeatTime = Date.now();
      }
      
      // Forward to console
      process.stdout.write(output);
    });

    // Capture stderr
    child.stderr.on("data", (data) => {
      const output = data.toString();
      outputBuffer += output;
      lastOutputTime = Date.now();
      
      logJson(
        "Build stderr output",
        {
          output: output.substring(0, 500),
          timeSinceStartMs: Date.now() - turboStartTime,
        },
        "H7"
      );
      
      // Forward to console
      process.stderr.write(output);
    });

    child.on("close", (code) => {
      clearInterval(heartbeatInterval);
      const turboDurationMs = turboStartTime ? Date.now() - turboStartTime : null;
      
      logJson(
        "Turbo build end",
        {
          durationMs: turboDurationMs,
          exitCode: code,
          totalOutputLines: outputBuffer.split("\n").length,
          lastOutputLine: lastOutputLine.substring(0, 200),
        },
        "H3"
      );
      
      if (code === 0) {
        resolve(code);
      } else {
        reject(new Error(`Build failed with exit code ${code}`));
      }
    });

    child.on("error", (error) => {
      clearInterval(heartbeatInterval);
      const turboDurationMs = turboStartTime ? Date.now() - turboStartTime : null;
      
      logJson(
        "Turbo build error",
        {
          durationMs: turboDurationMs,
          error: error?.message || String(error),
          stack: error?.stack,
        },
        "H8"
      );
      
      reject(error);
    });
  });

  // Log success
  logJson(
    "Build completed successfully",
    {
      exitCode: 0,
    },
    "F"
  );

  process.exit(0);
} catch (error) {
  const turboDurationMs = turboStartTime ? Date.now() - turboStartTime : null;
  // Log failure
  logJson(
    "Build failed",
    {
      exitCode: error?.status || error?.code || 1,
      error: error?.message || String(error),
      stack: error?.stack,
      durationMs: turboDurationMs,
    },
    "G"
  );

  process.exit(error?.status || error?.code || 1);
}
})();
