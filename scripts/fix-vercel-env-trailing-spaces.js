#!/usr/bin/env node
/**
 * Fix trailing spaces and newlines in Vercel environment variables
 * This script will update Vercel env vars to remove trailing whitespace
 */

const { execSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const REPO_ROOT = path.resolve(__dirname, "..");

// Colors for terminal output
const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
};

function log(message, color = "reset") {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function parseEnvFile(content) {
  const vars = {};
  const lines = content.split("\n");
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2];
      
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      vars[key] = value;
    }
  }
  
  return vars;
}

function cleanValue(value) {
  if (!value || typeof value !== "string") {
    return value;
  }
  
  // Remove trailing newlines and spaces
  let cleaned = value.replace(/[\r\n]+$/, ""); // Remove trailing newlines
  cleaned = cleaned.replace(/\s+$/, ""); // Remove trailing spaces
  
  // Remove literal \n at the end
  cleaned = cleaned.replace(/\\n$/, "");
  
  return cleaned;
}

async function getVercelEnvVars() {
  try {
    log("Fetching environment variables from Vercel...", "cyan");
    
    // Use vercel env pull to get all env vars
    const tmpPath = path.join(REPO_ROOT, ".env.vercel.tmp");
    
    try {
      execSync("vercel env pull .env.vercel.tmp --yes", {
        encoding: "utf8",
        stdio: "pipe",
        cwd: REPO_ROOT,
      });
      
      if (fs.existsSync(tmpPath)) {
        const content = fs.readFileSync(tmpPath, "utf8");
        const vars = parseEnvFile(content);
        fs.unlinkSync(tmpPath);
        return vars;
      }
    } catch (e) {
      log(`Error: ${e.message}`, "red");
      log("Make sure you're logged in: vercel login", "yellow");
      return null;
    }
  } catch (error) {
    log(`Error: ${error.message}`, "red");
    return null;
  }
  
  return null;
}

function checkForIssues(vars) {
  const issues = [];
  
  for (const [key, value] of Object.entries(vars)) {
    if (!value || typeof value !== "string") continue;
    
    const cleaned = cleanValue(value);
    if (cleaned !== value) {
      issues.push({
        key,
        original: value,
        cleaned: cleaned,
        hasTrailingSpace: value !== value.trimEnd(),
        hasTrailingNewline: value.endsWith("\n") || value.endsWith("\r\n"),
        hasLiteralNewline: value.endsWith("\\n"),
      });
    }
  }
  
  return issues;
}

async function updateVercelEnvVar(key, value, environment = "production") {
  try {
    // Use vercel env add command to update the variable
    // Note: This will prompt, so we need to use --yes flag
    const command = `echo "${value}" | vercel env add ${key} ${environment} --yes`;
    
    log(`Updating ${key} for ${environment}...`, "cyan");
    
    // Actually, vercel env add doesn't work this way
    // We need to use the API or vercel env rm + vercel env add
    // For now, let's use a safer approach with vercel env pull/edit/push
    
    log(`  ⚠️  Manual update required for ${key}`, "yellow");
    log(`     Current value: ${JSON.stringify(value)}`, "red");
    log(`     Cleaned value: ${JSON.stringify(cleanValue(value))}`, "green");
    
    return false;
  } catch (error) {
    log(`  ❌ Error updating ${key}: ${error.message}`, "red");
    return false;
  }
}

async function main() {
  log("=".repeat(80), "cyan");
  log("VERCEL ENVIRONMENT VARIABLE CLEANUP", "cyan");
  log("=".repeat(80) + "\n", "cyan");
  
  // Get Vercel env vars
  const vercelVars = await getVercelEnvVars();
  if (!vercelVars) {
    log("\n❌ Could not fetch Vercel environment variables.", "red");
    log("Make sure you're logged in: vercel login", "yellow");
    process.exit(1);
  }
  
  log(`Found ${Object.keys(vercelVars).length} variables in Vercel\n`, "green");
  
  // Check for issues
  const issues = checkForIssues(vercelVars);
  
  if (issues.length === 0) {
    log("✅ No trailing whitespace or newline issues found!", "green");
    process.exit(0);
  }
  
  log(`\n⚠️  Found ${issues.length} variables with trailing whitespace/newlines:\n`, "yellow");
  
  // Display issues
  for (const issue of issues) {
    log(`\n${issue.key}:`, "yellow");
    log(`  Original: ${JSON.stringify(issue.original)}`, "red");
    log(`  Cleaned:  ${JSON.stringify(issue.cleaned)}`, "green");
    
    const problems = [];
    if (issue.hasTrailingSpace) problems.push("trailing spaces");
    if (issue.hasTrailingNewline) problems.push("trailing newline");
    if (issue.hasLiteralNewline) problems.push("literal \\n");
    
    log(`  Issues: ${problems.join(", ")}`, "yellow");
  }
  
  log("\n" + "=".repeat(80), "cyan");
  log("\n📝 TO FIX THESE ISSUES:", "cyan");
  log("\nOption 1: Use Vercel Dashboard (Recommended)", "blue");
  log("1. Go to: https://vercel.com/[your-team]/[your-project]/settings/environment-variables", "blue");
  log("2. For each variable listed above:", "blue");
  log("   a. Click on the variable", "blue");
  log("   b. Copy the 'Cleaned' value shown above", "blue");
  log("   c. Paste it into Vercel (make sure there are no trailing spaces)", "blue");
  log("   d. Save", "blue");
  
  log("\nOption 2: Use Vercel CLI (Advanced)", "blue");
  log("Run these commands for each variable:", "blue");
  for (const issue of issues) {
    log(`\n  # Fix ${issue.key}:`, "cyan");
    log(`  vercel env rm ${issue.key} production --yes`, "yellow");
    log(`  echo "${issue.cleaned}" | vercel env add ${issue.key} production`, "yellow");
    log(`  vercel env rm ${issue.key} preview --yes`, "yellow");
    log(`  echo "${issue.cleaned}" | vercel env add ${issue.key} preview`, "yellow");
    log(`  vercel env rm ${issue.key} development --yes`, "yellow");
    log(`  echo "${issue.cleaned}" | vercel env add ${issue.key} development`, "yellow");
  }
  
  log("\n" + "=".repeat(80), "cyan");
  log("\n⚠️  IMPORTANT: After updating, redeploy your application!", "yellow");
  
  process.exit(1);
}

main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});
