# Vercel Build Troubleshooting Guide

## Common Build Failures and Solutions

### 1. ❌ "Please set NEXTAUTH_SECRET" or "Please set CALENDSO_ENCRYPTION_KEY"

**Error**: Build fails immediately with environment variable errors

**Solution**: 
1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add these required variables:
   - `NEXTAUTH_SECRET` - Generate with: `openssl rand -base64 32`
   - `CALENDSO_ENCRYPTION_KEY` - Generate with: `openssl rand -base64 32`
   - `NEXTAUTH_URL` - Set to: `https://your-app.vercel.app/api/auth`
   - `DATABASE_URL` - Your Supabase connection string
   - `DATABASE_DIRECT_URL` - Same as DATABASE_URL

**Important**: Set these for **all environments** (Production, Preview, Development)

### 2. ❌ "Cannot use import statement outside a module"

**Error**: Build script fails with ES module syntax error

**Solution**: ✅ **FIXED** - The build script has been renamed to `.mjs` extension

### 3. ❌ "turbo.json not found" or "Build command failed"

**Error**: Turbo can't find configuration files

**Solution**: 
1. Go to Vercel Dashboard → Your Project → Settings → General
2. Check **Root Directory** setting:
   - ✅ **CORRECT**: Should be empty or `.` (root of repository)
   - ❌ **WRONG**: Should NOT be `apps/web`

**Why**: The build command `turbo run build --filter=@calcom/web...` needs access to the root `turbo.json` file.

### 4. ❌ Build times out or takes too long (>20 minutes)

**Error**: Build exceeds Vercel's timeout limits

**Solution**: Enable Turbo remote caching:
1. Get Turbo credentials:
   - Go to https://turbo.build and create account
   - Get your `TURBO_TOKEN` and `TURBO_TEAM` name
2. Add to Vercel Environment Variables:
   - `TURBO_TOKEN` = your-turbo-token
   - `TURBO_TEAM` = your-team-name (e.g., `tindeveloper`)
3. Set for all environments (Production, Preview, Development)

**Expected**: First build ~15 min, subsequent builds ~5-8 min

### 5. ❌ Database connection errors during build

**Error**: Prisma can't connect to database

**Solution**: 
1. Ensure `DATABASE_URL` and `DATABASE_DIRECT_URL` are set correctly
2. Use Supabase connection pooler URL (IPv4 compatible):
   ```
   postgresql://postgres.grvmdhsntdghxdiastot:[PASSWORD]@aws-1-eu-west-2.pooler.supabase.com:5432/postgres
   ```
3. Verify database is not paused in Supabase dashboard
4. Check firewall rules allow Vercel IPs

### 6. ❌ "Build script not found" or "Command failed"

**Error**: Vercel can't find the build script

**Solution**: 
1. Verify `apps/web/vercel.json` has:
   ```json
   {
     "buildCommand": "node scripts/vercel-build-with-logging.mjs"
   }
   ```
2. Ensure Root Directory is set to `.` (root), not `apps/web`
3. Verify the script exists at `scripts/vercel-build-with-logging.mjs`

## Quick Checklist

Before deploying, verify:

- [ ] Root Directory is `.` (root) in Vercel settings
- [ ] `NEXTAUTH_SECRET` is set in Vercel env vars
- [ ] `CALENDSO_ENCRYPTION_KEY` is set in Vercel env vars
- [ ] `NEXTAUTH_URL` is set in Vercel env vars
- [ ] `DATABASE_URL` is set in Vercel env vars
- [ ] `DATABASE_DIRECT_URL` is set in Vercel env vars
- [ ] All env vars are set for Production, Preview, and Development
- [ ] Build script exists at `scripts/vercel-build-with-logging.mjs`
- [ ] `apps/web/vercel.json` references the correct script path

## How to View Build Logs

1. Go to: https://vercel.com/tindeveloper/cal-com-version-1-web/deployments
2. Click on the latest deployment
3. Click "Build Logs" tab
4. Look for error messages (they'll be highlighted in red)

## Local vs Vercel Differences

| Aspect | Localhost | Vercel |
|--------|-----------|--------|
| Database | Local Docker (port 5434) | Remote Supabase |
| Environment | Development | Production |
| Build Script | Not used | `vercel-build-with-logging.mjs` |
| Root Directory | N/A | Must be `.` (root) |
| Env Vars | `.env` file | Vercel Dashboard |

## Still Having Issues?

1. Run the diagnostic script locally:
   ```bash
   ./scripts/diagnose-vercel-build.sh
   ```

2. Check Vercel build logs for specific error messages

3. Verify all environment variables are set correctly (no trailing newlines)

4. Ensure Root Directory is set to `.` (root) in Vercel settings

5. Check that your Supabase database is accessible from the internet

