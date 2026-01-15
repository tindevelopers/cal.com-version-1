#!/usr/bin/env node
/**
 * Pre-build environment variable validation script
 * Checks for common issues like trailing spaces, missing values, etc.
 */

import process from "node:process";

const criticalEnvVars = [
  "DATABASE_URL",
  "DATABASE_DIRECT_URL",
  "NEXT_PUBLIC_WEBAPP_URL",
  "WEBAPP_URL",
  "NEXTAUTH_URL",
  "NEXTAUTH_SECRET",
  "CALENDSO_ENCRYPTION_KEY",
];

const issues: Array<{ var: string; issue: string; value: string }> = [];

for (const key of criticalEnvVars) {
  const value = process.env[key];
  
  if (!value) {
    issues.push({ var: key, issue: "Missing", value: "" });
    continue;
  }
  
  // Check for trailing spaces
  if (value.endsWith(" ") || value.endsWith("\t")) {
    issues.push({ var: key, issue: "Has trailing whitespace", value: value.slice(-10) });
  }
  
  // Check for leading spaces
  if (value.startsWith(" ") || value.startsWith("\t")) {
    issues.push({ var: key, issue: "Has leading whitespace", value: value.slice(0, 10) });
  }
  
  // Check for newlines in the middle (not at end, which is normal for .env files)
  if (value.includes("\n") && !value.endsWith("\n")) {
    issues.push({ var: key, issue: "Contains newline in middle", value: value.replace(/\n/g, "\\n") });
  }
  
  // Check for undefined string
  if (value === "undefined") {
    issues.push({ var: key, issue: "Value is literal 'undefined' string", value });
  }
}

if (issues.length > 0) {
  console.error("\n❌ Environment variable validation failed:\n");
  for (const { var: varName, issue, value: val } of issues) {
    console.error(`  ${varName}: ${issue}`);
    if (val) {
      console.error(`    Value preview: ${JSON.stringify(val)}`);
    }
  }
  console.error("\nPlease fix these issues before building.\n");
  process.exit(1);
} else {
  console.log("✅ Environment variable validation passed");
  process.exit(0);
}

