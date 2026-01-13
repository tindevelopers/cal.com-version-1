#!/usr/bin/env node
/**
 * Wrapper script for Vercel builds when the project's Root Directory is `apps/web`.
 *
 * The real build wrapper lives at the repo root: `scripts/vercel-build-with-logging.js`.
 * Vercel runs `node scripts/vercel-build-with-logging.js` relative to the Root Directory,
 * so we forward to the repo root script from here.
 */

const path = require("node:path");

// apps/web/scripts -> repo root/scripts
require(path.join(__dirname, "../../../scripts/vercel-build-with-logging.js"));

