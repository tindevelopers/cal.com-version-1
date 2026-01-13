#!/usr/bin/env node
/**
 * Compare Vercel environment variables with local .env files
 * Checks for trailing spaces and newlines
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
    // Skip empty lines and comments
    if (!trimmed || trimmed.startsWith("#")) continue;
    
    // Handle KEY="value" or KEY=value format
    const match = trimmed.match(/^([^=]+)=(.*)$/);
    if (match) {
      const key = match[1].trim();
      let value = match[2];
      
      // Remove quotes if present
      if ((value.startsWith('"') && value.endsWith('"')) || 
          (value.startsWith("'") && value.endsWith("'"))) {
        value = value.slice(1, -1);
      }
      
      vars[key] = value;
    }
  }
  
  return vars;
}

function checkTrailingWhitespace(value, key) {
  const issues = [];
  
  if (!value || typeof value !== "string") {
    return issues;
  }
  
  // Check for trailing spaces
  if (value !== value.trimEnd()) {
    issues.push({
      type: "trailing_space",
      key,
      original: JSON.stringify(value),
      cleaned: JSON.stringify(value.trimEnd()),
      hasTrailingSpace: true,
    });
  }
  
  // Check for trailing newlines
  if (value.endsWith("\n") || value.endsWith("\r\n")) {
    issues.push({
      type: "trailing_newline",
      key,
      original: JSON.stringify(value),
      cleaned: JSON.stringify(value.replace(/[\r\n]+$/, "")),
      hasTrailingNewline: true,
    });
  }
  
  // Check for newlines in the middle (but not at the end)
  const trimmed = value.trimEnd();
  if (trimmed.includes("\n")) {
    const lines = trimmed.split("\n");
    if (lines.length > 1) {
      issues.push({
        type: "newline_in_value",
        key,
        lineCount: lines.length,
      });
    }
  }
  
  // Check for literal \n string (backslash-n) at the end
  if (value.endsWith("\\n")) {
    issues.push({
      type: "literal_newline_string",
      key,
      original: JSON.stringify(value),
      cleaned: JSON.stringify(value.replace(/\\n$/, "")),
      hasLiteralNewline: true,
    });
  }
  
  return issues;
}

async function getVercelEnvVars() {
  try {
    log("Fetching environment variables from Vercel...", "cyan");
    
    // Get project info first
    let projectId;
    try {
      const projectInfo = execSync("vercel ls --json", { 
        encoding: "utf8",
        stdio: "pipe",
        cwd: REPO_ROOT,
      });
      const projects = JSON.parse(projectInfo);
      if (projects.length === 0) {
        log("No Vercel projects found. Make sure you're logged in.", "yellow");
        return null;
      }
      // Use the first project or you can filter by name
      projectId = projects[0].id;
      log(`Using project: ${projects[0].name} (${projectId})`, "blue");
    } catch (e) {
      log(`Error getting project info: ${e.message}`, "yellow");
      log("Trying to get env vars for current project...", "yellow");
    }
    
    // Try to get env vars - this might require project to be linked
    try {
      const envOutput = execSync("vercel env ls --json", {
        encoding: "utf8",
        stdio: "pipe",
        cwd: REPO_ROOT,
      });
      
      const envList = JSON.parse(envOutput);
      const vars = {};
      
      // Fetch each environment variable
      for (const envVar of envList) {
        try {
          // Get the value for each environment (production, preview, development)
          for (const target of ["production", "preview", "development"]) {
            try {
              const valueOutput = execSync(
                `vercel env pull --environment=${target} --yes 2>/dev/null || echo ""`,
                { encoding: "utf8", stdio: "pipe", cwd: REPO_ROOT }
              );
              
              // Parse the .env.local file that gets created
              const envLocalPath = path.join(REPO_ROOT, ".env.local");
              if (fs.existsSync(envLocalPath)) {
                const content = fs.readFileSync(envLocalPath, "utf8");
                const parsed = parseEnvFile(content);
                Object.assign(vars, parsed);
                // Clean up
                fs.unlinkSync(envLocalPath);
                break; // Only need to pull once
              }
            } catch (e) {
              // Continue to next target
            }
          }
        } catch (e) {
          // Skip this var if we can't fetch it
        }
      }
      
      return vars;
    } catch (e) {
      log(`Error fetching env vars: ${e.message}`, "yellow");
      log("Trying alternative method...", "yellow");
      
      // Alternative: Use vercel env pull to get all env vars
      try {
        execSync("vercel env pull .env.vercel.tmp --yes", {
          encoding: "utf8",
          stdio: "pipe",
          cwd: REPO_ROOT,
        });
        
        const tmpPath = path.join(REPO_ROOT, ".env.vercel.tmp");
        if (fs.existsSync(tmpPath)) {
          const content = fs.readFileSync(tmpPath, "utf8");
          const vars = parseEnvFile(content);
          fs.unlinkSync(tmpPath);
          return vars;
        }
      } catch (e2) {
        log(`Alternative method also failed: ${e2.message}`, "red");
        return null;
      }
    }
  } catch (error) {
    log(`Error: ${error.message}`, "red");
    log("Make sure you're logged in to Vercel: vercel login", "yellow");
    return null;
  }
  
  return null;
}

function getLocalEnvVars() {
  const localVars = {};
  const envFiles = [".env", ".env.local", ".env.vercel"];
  
  for (const envFile of envFiles) {
    const filePath = path.join(REPO_ROOT, envFile);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, "utf8");
        const parsed = parseEnvFile(content);
        Object.assign(localVars, parsed);
        log(`Loaded ${Object.keys(parsed).length} vars from ${envFile}`, "green");
      } catch (e) {
        log(`Error reading ${envFile}: ${e.message}`, "yellow");
      }
    }
  }
  
  return localVars;
}

function compareEnvVars(vercelVars, localVars) {
  const results = {
    onlyInVercel: [],
    onlyInLocal: [],
    different: [],
    same: [],
    trailingWhitespaceIssues: [],
  };
  
  const allKeys = new Set([
    ...Object.keys(vercelVars || {}),
    ...Object.keys(localVars || {}),
  ]);
  
  for (const key of allKeys) {
    const vercelValue = vercelVars?.[key];
    const localValue = localVars?.[key];
    
    if (vercelValue === undefined && localValue !== undefined) {
      results.onlyInLocal.push(key);
    } else if (vercelValue !== undefined && localValue === undefined) {
      results.onlyInVercel.push(key);
    } else if (vercelValue !== localValue) {
      results.different.push({
        key,
        vercel: vercelValue,
        local: localValue,
      });
    } else {
      results.same.push(key);
    }
    
    // Check for trailing whitespace in both
    if (vercelValue) {
      const issues = checkTrailingWhitespace(vercelValue, key);
      if (issues.length > 0) {
        results.trailingWhitespaceIssues.push({
          source: "vercel",
          key,
          issues,
        });
      }
    }
    
    if (localValue) {
      const issues = checkTrailingWhitespace(localValue, key);
      if (issues.length > 0) {
        results.trailingWhitespaceIssues.push({
          source: "local",
          key,
          issues,
        });
      }
    }
  }
  
  return results;
}

function printResults(results) {
  log("\n" + "=".repeat(80), "cyan");
  log("ENVIRONMENT VARIABLE COMPARISON RESULTS", "cyan");
  log("=".repeat(80) + "\n", "cyan");
  
  // Trailing whitespace issues
  if (results.trailingWhitespaceIssues.length > 0) {
    log("⚠️  TRAILING WHITESPACE/NEWLINE ISSUES FOUND:", "red");
    log("-".repeat(80), "yellow");
    for (const issue of results.trailingWhitespaceIssues) {
      log(`\nSource: ${issue.source.toUpperCase()}`, "yellow");
      log(`Key: ${issue.key}`, "yellow");
      for (const detail of issue.issues) {
        if (detail.type === "trailing_space") {
          log(`  ❌ Trailing spaces found`, "red");
          log(`     Original: ${detail.original}`, "red");
          log(`     Cleaned:  ${detail.cleaned}`, "green");
        } else if (detail.type === "trailing_newline") {
          log(`  ❌ Trailing newline found`, "red");
          log(`     Original: ${detail.original}`, "red");
          log(`     Cleaned:  ${detail.cleaned}`, "green");
        } else if (detail.type === "newline_in_value") {
          log(`  ⚠️  Newline in middle of value (${detail.lineCount} lines)`, "yellow");
        }
      }
    }
    log("\n" + "-".repeat(80) + "\n", "yellow");
  } else {
    log("✅ No trailing whitespace or newline issues found", "green");
  }
  
  // Variables only in Vercel
  if (results.onlyInVercel.length > 0) {
    log(`\n📤 Variables only in Vercel (${results.onlyInVercel.length}):`, "blue");
    for (const key of results.onlyInVercel.sort()) {
      log(`   - ${key}`, "blue");
    }
  }
  
  // Variables only in Local
  if (results.onlyInLocal.length > 0) {
    log(`\n📥 Variables only in Local (${results.onlyInLocal.length}):`, "yellow");
    for (const key of results.onlyInLocal.sort()) {
      log(`   - ${key}`, "yellow");
    }
  }
  
  // Different values
  if (results.different.length > 0) {
    log(`\n🔄 Variables with different values (${results.different.length}):`, "yellow");
    for (const diff of results.different) {
      log(`   ${diff.key}:`, "yellow");
      log(`     Vercel:  ${JSON.stringify(diff.vercel)}`, "blue");
      log(`     Local:   ${JSON.stringify(diff.local)}`, "yellow");
    }
  }
  
  // Same values
  if (results.same.length > 0) {
    log(`\n✅ Matching variables (${results.same.length}):`, "green");
    if (results.same.length <= 20) {
      for (const key of results.same.sort()) {
        log(`   - ${key}`, "green");
      }
    } else {
      log(`   (Showing first 20 of ${results.same.length})`, "green");
      for (const key of results.same.sort().slice(0, 20)) {
        log(`   - ${key}`, "green");
      }
    }
  }
  
  log("\n" + "=".repeat(80), "cyan");
  
  // Summary
  const hasIssues = 
    results.trailingWhitespaceIssues.length > 0 ||
    results.different.length > 0;
  
  if (hasIssues) {
    log("\n⚠️  ACTION REQUIRED: Issues found that need attention", "red");
    return 1;
  } else {
    log("\n✅ All checks passed!", "green");
    return 0;
  }
}

async function main() {
  log("Starting environment variable comparison...\n", "cyan");
  
  // Get Vercel env vars
  const vercelVars = await getVercelEnvVars();
  if (!vercelVars) {
    log("\n⚠️  Could not fetch Vercel environment variables.", "yellow");
    log("Make sure you're logged in: vercel login", "yellow");
    log("And that your project is linked: vercel link", "yellow");
    process.exit(1);
  }
  
  log(`Found ${Object.keys(vercelVars).length} variables in Vercel\n`, "green");
  
  // Get local env vars
  const localVars = getLocalEnvVars();
  log(`Found ${Object.keys(localVars).length} variables in local files\n`, "green");
  
  // Compare
  const results = compareEnvVars(vercelVars, localVars);
  
  // Print results
  const exitCode = printResults(results);
  process.exit(exitCode);
}

main().catch((error) => {
  log(`\n❌ Fatal error: ${error.message}`, "red");
  console.error(error);
  process.exit(1);
});
