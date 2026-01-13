#!/usr/bin/env node
/**
 * Wrapper script for Vercel builds when the project's Root Directory is `apps/web`.
 *
 * The real build wrapper lives at the repo root: `scripts/vercel-build-with-logging.mjs`.
 * Vercel runs `node scripts/vercel-build-with-logging.mjs` relative to the Root Directory,
 * so we forward to the repo root script from here.
 *
 * NOTE: Root Directory should be set to '.' (root) in Vercel settings, not 'apps/web'.
 * This wrapper is only needed if Root Directory is incorrectly set to 'apps/web'.
 */

import { fileURLToPath } from "node:url";
import path from "node:path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// apps/web/scripts -> repo root/scripts
const rootScript = path.join(__dirname, "../../../scripts/vercel-build-with-logging.mjs");

try {
  await import(rootScript);
} catch (error) {
  console.error("Failed to load build script:", error);
  console.error("\n⚠️  ERROR: Root Directory should be set to '.' (root) in Vercel settings.");
  console.error("Current Root Directory appears to be 'apps/web', which is incorrect.");
  console.error("\nTo fix:");
  console.error("1. Go to Vercel Dashboard → Settings → General");
  console.error("2. Set Root Directory to '.' (or leave empty)");
  console.error("3. Redeploy");
  process.exit(1);
}

