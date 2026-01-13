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
  logJson('Build started', {
    pwd: process.cwd(),
    user: process.env.USER || process.env.USERNAME || 'unknown',
    nodeVersion: process.version,
    platform: process.platform,
    arch: process.arch,
  }, 'A');

  // Log environment variables (non-sensitive)
  logJson('Environment check', {
    VERCEL: process.env.VERCEL || 'not-set',
    VERCEL_ENV: process.env.VERCEL_ENV || 'not-set',
    NODE_ENV: process.env.NODE_ENV || 'not-set',
    CI: process.env.CI || 'not-set',
    BUILD_STANDALONE: process.env.BUILD_STANDALONE || 'not-set',
    ROOT_DIRECTORY: process.env.VERCEL_ROOT_DIRECTORY || 'not-set',
  }, 'B');

  // Log filesystem state
  const rootExists = fs.existsSync(path.join(process.cwd(), 'package.json'));
  const turboJsonExists = fs.existsSync(path.join(process.cwd(), 'turbo.json'));
  const appsWebExists = fs.existsSync(path.join(process.cwd(), 'apps/web'));
  const packagesExists = fs.existsSync(path.join(process.cwd(), 'packages'));

  logJson('Filesystem check', {
    rootExists,
    turboJsonExists,
    appsWebExists,
    packagesExists,
    workingDir: process.cwd(),
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
  }, 'E');

  // Execute the actual build command
  console.log('Executing:', buildCommand);
  execSync(buildCommand, {
    stdio: 'inherit',
    cwd: process.cwd(),
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
