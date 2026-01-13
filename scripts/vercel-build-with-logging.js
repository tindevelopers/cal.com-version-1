#!/usr/bin/env node
/**
 * Build wrapper script with instrumentation for Vercel builds
 * Logs key information to help debug build failures
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const LOG_FILE = path.join(__dirname, "../.cursor/debug.log");
const SESSION_ID = `vercel-build-${Date.now()}`;
const RUN_ID = `build-${Date.now()}`;
const REPO_ROOT = path.resolve(__dirname, "..");

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
function logJson(message, data, hypothesisId = 'general') {
  const logEntry = {
    sessionId: SESSION_ID,
    runId: RUN_ID,
    hypothesisId,
    location: `vercel-build.js:${new Error().stack.split('\n')[1]?.trim() || 'unknown'}`,
    message,
    data: typeof data === 'string' ? JSON.parse(data) : data,
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

  logJson('Build started', {
    repoRoot: REPO_ROOT,
    pwd: process.cwd(),
    user: process.env.USER || process.env.USERNAME || 'unknown',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
    vercelGitCommitSha: process.env.VERCEL_GIT_COMMIT_SHA ? "set" : "not-set",
    vercelGitCommitRef: process.env.VERCEL_GIT_COMMIT_REF || "not-set",
  }, 'A');

  // Log environment variables (non-sensitive)
  logJson('Environment check', {
    VERCEL: process.env.VERCEL || 'not-set',
    VERCEL_ENV: process.env.VERCEL_ENV || 'not-set',
    NODE_ENV: process.env.NODE_ENV || 'not-set',
    CI: process.env.CI || 'not-set',
    BUILD_STANDALONE: process.env.BUILD_STANDALONE || 'not-set',
    ROOT_DIRECTORY: process.env.VERCEL_ROOT_DIRECTORY || 'not-set',
    VERCEL_GIT_COMMIT_SHA: process.env.VERCEL_GIT_COMMIT_SHA ? "set" : "not-set",
    VERCEL_GIT_COMMIT_REF: process.env.VERCEL_GIT_COMMIT_REF || "not-set",
    CSP_POLICY: process.env.CSP_POLICY || "not-set",
    NODE_OPTIONS: process.env.NODE_OPTIONS || "not-set",
    has_NEXTAUTH_SECRET: Boolean(process.env.NEXTAUTH_SECRET),
    has_CALENDSO_ENCRYPTION_KEY: Boolean(process.env.CALENDSO_ENCRYPTION_KEY),
  }, 'B');

  // Log filesystem state
  const rootPackageJsonExists = fs.existsSync(path.join(REPO_ROOT, "package.json"));
  const turboJsonExists = fs.existsSync(path.join(REPO_ROOT, "turbo.json"));
  const appsWebExists = fs.existsSync(path.join(REPO_ROOT, "apps/web"));
  const packagesExists = fs.existsSync(path.join(REPO_ROOT, "packages"));

  logJson('Filesystem check', {
    rootPackageJsonExists,
    turboJsonExists,
    appsWebExists,
    packagesExists,
    workingDir: process.cwd(),
    repoRoot: REPO_ROOT,
  }, 'C');

  // Get yarn and turbo versions
  let yarnVersion = 'unknown';
  let turboVersion = 'unknown';
  try {
    yarnVersion = execSync('yarn --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    yarnVersion = 'error';
  }
  try {
    turboVersion = execSync('turbo --version', { encoding: 'utf8', stdio: 'pipe' }).trim();
  } catch (e) {
    turboVersion = 'error';
  }

  logJson('Tool versions', {
    yarnVersion,
    turboVersion,
  }, 'D');

  // Log before turbo command
  const buildCommand = 'turbo run build --filter=@calcom/web...';
  logJson('Before turbo build', {
    command: buildCommand,
    workingDir: process.cwd(),
    repoRoot: REPO_ROOT,
  }, 'E');

  // Execute the actual build command
  console.log('Executing:', buildCommand);
  execSync(buildCommand, {
    stdio: 'inherit',
    cwd: REPO_ROOT,
  });

  // Log success
  logJson('Build completed successfully', {
    exitCode: 0,
  }, 'F');

  process.exit(0);
} catch (error) {
  // Log failure
  logJson('Build failed', {
    exitCode: error.status || 1,
    error: error.message,
    stack: error.stack,
  }, 'G');

  process.exit(error.status || 1);
}
