#!/bin/bash
# Post-deployment script for Vercel to run database migrations
# This script should be called via Vercel's deployment hooks or manually after deployment

set -e

echo "=== Vercel Post-Deployment Migration Script ==="

# Check if we're on Vercel
if [ "$VERCEL" != "1" ]; then
  echo "Not running on Vercel, skipping post-deploy script"
  exit 0
fi

# Check required environment variables
if [ -z "$DATABASE_URL" ]; then
  echo "ERROR: DATABASE_URL is not set"
  exit 1
fi

if [ -z "$DATABASE_DIRECT_URL" ]; then
  echo "WARNING: DATABASE_DIRECT_URL is not set, using DATABASE_URL"
  export DATABASE_DIRECT_URL="$DATABASE_URL"
fi

if [ -z "$MIGRATION_SECRET_TOKEN" ]; then
  echo "WARNING: MIGRATION_SECRET_TOKEN is not set, migrations will need to be run manually"
  echo "Call POST /api/migrations/deploy with Authorization header after deployment"
  exit 0
fi

# Get the deployment URL
DEPLOYMENT_URL="${VERCEL_URL:-${NEXT_PUBLIC_WEBAPP_URL}}"
if [ -z "$DEPLOYMENT_URL" ]; then
  echo "ERROR: Cannot determine deployment URL (VERCEL_URL or NEXT_PUBLIC_WEBAPP_URL not set)"
  exit 1
fi

# Ensure URL starts with https://
if [[ ! "$DEPLOYMENT_URL" =~ ^https?:// ]]; then
  DEPLOYMENT_URL="https://${DEPLOYMENT_URL}"
fi

echo "Running migrations on: ${DEPLOYMENT_URL}"
echo "Database: ${DATABASE_URL%%@*}@***" # Hide password in logs

# Call the migration endpoint
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "${DEPLOYMENT_URL}/api/migrations/deploy" \
  -H "Authorization: Bearer ${MIGRATION_SECRET_TOKEN}" \
  -H "Content-Type: application/json")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | sed '$d')

if [ "$HTTP_CODE" -eq 200 ]; then
  echo "✓ Migrations deployed successfully"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 0
else
  echo "✗ Migration deployment failed (HTTP $HTTP_CODE)"
  echo "$BODY" | jq '.' 2>/dev/null || echo "$BODY"
  exit 1
fi
