#!/bin/bash
# Build wrapper script with instrumentation for Vercel builds
# Logs key information to help debug build failures

LOG_FILE="/Users/foo/projects/cal.com/.cursor/debug.log"
SESSION_ID="vercel-build-$(date +%s)"
RUN_ID="build-$(date +%s)"

# Helper function to log JSON to file
log_json() {
  local message="$1"
  local data="$2"
  local hypothesis_id="${3:-general}"
  
  local json_log=$(cat <<EOF
{"sessionId":"${SESSION_ID}","runId":"${RUN_ID}","hypothesisId":"${hypothesis_id}","location":"vercel-build.sh:${BASH_LINENO[0]}","message":"${message}","data":${data},"timestamp":$(date +%s000)}
EOF
)
  echo "$json_log" >> "$LOG_FILE"
}

# Log build start
log_json "Build started" "{\"pwd\":\"$(pwd)\",\"user\":\"$(whoami)\",\"node_version\":\"$(node --version)\",\"yarn_version\":\"$(yarn --version)\",\"turbo_version\":\"$(turbo --version 2>/dev/null || echo 'not-found')\"}" "A"

# Log environment variables (non-sensitive)
log_json "Environment check" "{\"VERCEL\":\"${VERCEL:-not-set}\",\"VERCEL_ENV\":\"${VERCEL_ENV:-not-set}\",\"NODE_ENV\":\"${NODE_ENV:-not-set}\",\"CI\":\"${CI:-not-set}\",\"BUILD_STANDALONE\":\"${BUILD_STANDALONE:-not-set}\"}" "B"

# Log filesystem state
log_json "Filesystem check" "{\"root_exists\":\"$([ -f package.json ] && echo 'yes' || echo 'no')\",\"turbo_json_exists\":\"$([ -f turbo.json ] && echo 'yes' || echo 'no')\",\"apps_web_exists\":\"$([ -d apps/web ] && echo 'yes' || echo 'no')\",\"packages_exists\":\"$([ -d packages ] && echo 'yes' || echo 'no')\"}" "C"

# Log before turbo command
log_json "Before turbo build" "{\"command\":\"turbo run build --filter=@calcom/web...\",\"working_dir\":\"$(pwd)\"}" "D"

# Execute the actual build command with error handling
set -e
trap 'log_json "Build failed" "{\"exit_code\":\"$?\",\"last_command\":\"${BASH_COMMAND}\"}" "E"; exit $?' ERR

# Run turbo build
turbo run build --filter=@calcom/web...

# Log success
log_json "Build completed successfully" "{\"exit_code\":\"0\"}" "F"
