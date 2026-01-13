#!/bin/bash
# Diagnostic script to identify Vercel build issues

echo "🔍 Vercel Build Diagnostic Tool"
echo "================================"
echo ""

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
  echo "❌ Error: Must run from repository root"
  exit 1
fi

echo "✅ Running from repository root"
echo ""

# Check required files
echo "📁 Checking required files..."
FILES=(
  "package.json"
  "turbo.json"
  "apps/web/package.json"
  "apps/web/vercel.json"
  "apps/web/next.config.ts"
  "packages/prisma/schema.prisma"
)

for file in "${FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file (MISSING)"
  fi
done
echo ""

# Check build script
echo "🔧 Checking build configuration..."
if grep -q "vercel-build-with-logging.mjs" apps/web/vercel.json; then
  echo "  ✅ Build script configured in vercel.json"
else
  echo "  ❌ Build script not found in vercel.json"
fi

if [ -f "scripts/vercel-build-with-logging.mjs" ]; then
  echo "  ✅ Build script exists"
  # Check for syntax errors
  if node --check scripts/vercel-build-with-logging.mjs 2>/dev/null; then
    echo "  ✅ Build script syntax is valid"
  else
    echo "  ❌ Build script has syntax errors"
    node --check scripts/vercel-build-with-logging.mjs
  fi
else
  echo "  ❌ Build script missing"
fi
echo ""

# Check environment variable requirements from next.config.ts
echo "🔐 Checking environment variable requirements..."
REQUIRED_VARS=(
  "NEXTAUTH_SECRET"
  "CALENDSO_ENCRYPTION_KEY"
  "NEXTAUTH_URL"
)

echo "Required environment variables (from next.config.ts):"
for var in "${REQUIRED_VARS[@]}"; do
  if [ -n "${!var}" ]; then
    echo "  ✅ $var is set"
  else
    echo "  ❌ $var is NOT set (will cause build failure)"
  fi
done
echo ""

# Check database URLs
echo "🗄️  Checking database configuration..."
if [ -n "$DATABASE_URL" ]; then
  echo "  ✅ DATABASE_URL is set"
  if [[ "$DATABASE_URL" == *"supabase"* ]]; then
    echo "  ✅ Using Supabase database"
  fi
else
  echo "  ❌ DATABASE_URL is NOT set"
fi

if [ -n "$DATABASE_DIRECT_URL" ]; then
  echo "  ✅ DATABASE_DIRECT_URL is set"
else
  echo "  ⚠️  DATABASE_DIRECT_URL is NOT set (may be needed for migrations)"
fi
echo ""

# Check Vercel-specific settings
echo "⚙️  Checking Vercel configuration..."
if [ -n "$VERCEL" ]; then
  echo "  ✅ Running in Vercel environment"
  echo "  VERCEL_ENV: ${VERCEL_ENV:-not-set}"
  echo "  VERCEL_URL: ${VERCEL_URL:-not-set}"
else
  echo "  ℹ️  Running locally (not in Vercel)"
fi
echo ""

# Check Turbo configuration
echo "🚀 Checking Turbo configuration..."
if [ -f "turbo.json" ]; then
  echo "  ✅ turbo.json exists"
  if grep -q "build.*@calcom/web" turbo.json; then
    echo "  ✅ Build task configured for @calcom/web"
  fi
else
  echo "  ❌ turbo.json missing"
fi

if [ -n "$TURBO_TOKEN" ]; then
  echo "  ✅ TURBO_TOKEN is set (remote caching enabled)"
else
  echo "  ⚠️  TURBO_TOKEN is NOT set (remote caching disabled - builds will be slower)"
fi

if [ -n "$TURBO_TEAM" ]; then
  echo "  ✅ TURBO_TEAM is set: $TURBO_TEAM"
else
  echo "  ⚠️  TURBO_TEAM is NOT set"
fi
echo ""

# Check Node/Yarn versions
echo "📦 Checking tool versions..."
echo "  Node: $(node --version 2>/dev/null || echo 'not found')"
echo "  Yarn: $(yarn --version 2>/dev/null || echo 'not found')"
echo "  Turbo: $(turbo --version 2>/dev/null || echo 'not found')"
echo ""

# Summary
echo "📋 Summary"
echo "=========="
echo ""
echo "Common Vercel build issues to check:"
echo ""
echo "1. ✅ Root Directory: Should be '.' (root) NOT 'apps/web'"
echo "   → Check in Vercel Dashboard → Settings → General"
echo ""
echo "2. ✅ Required Environment Variables:"
echo "   - NEXTAUTH_SECRET (required)"
echo "   - CALENDSO_ENCRYPTION_KEY (required)"
echo "   - NEXTAUTH_URL (required)"
echo "   - DATABASE_URL (required)"
echo "   → Check in Vercel Dashboard → Settings → Environment Variables"
echo ""
echo "3. ✅ Build Command: Should use 'node scripts/vercel-build-with-logging.mjs'"
echo "   → Check in apps/web/vercel.json"
echo ""
echo "4. ✅ Install Command: Should be 'yarn install'"
echo "   → Check in apps/web/vercel.json"
echo ""
echo "5. ⚠️  Optional but Recommended:"
echo "   - TURBO_TOKEN (for faster builds)"
echo "   - TURBO_TEAM (for faster builds)"
echo "   - DATABASE_DIRECT_URL (for migrations)"
echo ""
echo "To view Vercel build logs:"
echo "  → Go to: https://vercel.com/tindeveloper/cal-com-version-1-web/deployments"
echo ""

