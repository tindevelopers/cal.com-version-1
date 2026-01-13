# Vercel Configuration Checklist - Build Performance Fix

## ✅ Changes Made to Code

1. **Enabled caching for `@calcom/prisma#post-install`** in `turbo.json`
   - Changed `cache: false` → `cache: true`
   - Added proper `outputs` and `inputs` for cache invalidation

2. **Enabled caching for `@calcom/embed-core#build`** in `turbo.json`
   - Changed `cache: false` → `cache: true`
   - Added proper `inputs` for cache invalidation

3. **Updated `@calcom/web#build` outputs** in `turbo.json`
   - Added `.next/cache/**` to outputs for better caching

## 🔧 Required Vercel Dashboard Configuration

### Step 1: Verify Root Directory Setting

**CRITICAL**: Check your Vercel project settings:

1. Go to Vercel Dashboard → Your Project → Settings → General
2. Check **"Root Directory"** setting:
   - ✅ **CORRECT**: Should be empty or `.` (root of repository)
   - ❌ **WRONG**: Should NOT be `apps/web`

**Why**: The `vercel.json` uses `turbo run build --filter=@calcom/web...` which requires access to the root `turbo.json` file. If root directory is set to `apps/web`, Turbo won't find the config.

**If root directory is currently `apps/web`**, you have two options:

**Option A (Recommended)**: Change root directory to `.` (root)
- Root Directory: `.` (or leave empty)
- Build Command: `turbo run build --filter=@calcom/web...` (already in vercel.json)
- Install Command: `yarn install` (already in vercel.json)

**Option B**: Keep root directory as `apps/web` and update vercel.json:
- Root Directory: `apps/web`
- Build Command: `cd ../.. && yarn build`
- Install Command: `cd ../.. && yarn install`

### Step 2: Set Turbo Remote Cache Environment Variables ⚠️ CRITICAL

**This is the most important step for reducing build times!**

#### Option A: Using Turbo CLI (Recommended - Easiest Method)

1. **Login to Vercel via Turbo CLI:**
   ```bash
   npx turbo login
   ```
   This will open a browser for authentication. You're already logged in! ✅

2. **Link your project:**
   ```bash
   npx turbo link --scope tindeveloper
   ```
   Or run `npx turbo link` and select your team when prompted.

3. **Extract credentials from `.turbo/config.json`:**
   
   After running `turbo link`, check `.turbo/config.json`:
   ```bash
   cat .turbo/config.json
   ```
   
   **Current config shows:**
   - `teamId`: `team_3Y0hANzD4PovKmUwUyc2WVpb` → This is your `TURBO_TEAM`
   
   **Extract teamId:**
   ```bash
   # Extract teamId from config
   TURBO_TEAM=$(node -e "console.log(require('./.turbo/config.json').teamId)")
   echo "TURBO_TEAM=$TURBO_TEAM"
   # Should output: team_3Y0hANzD4PovKmUwUyc2WVpb
   ```
   
   **For TURBO_TOKEN**: The token is stored by Turbo's authentication system. Get it from:
   - **Vercel Dashboard**: https://vercel.com/account/tokens
   - Click **"Create Token"**
   - Name it (e.g., "Turbo Remote Cache")
   - Copy the token → This is your `TURBO_TOKEN`
   - ⚠️ **Copy it immediately** - you won't see it again!

4. **Add to Vercel Environment Variables:**
   
   Go to: **Vercel Dashboard → Your Project → Settings → Environment Variables**
   
   **Variable 1:**
   - Name: `TURBO_TOKEN`
   - Value: `[token from .turbo/config.json]`
   - Environment: ✅ Production ✅ Preview ✅ Development
   
   **Variable 2:**
   - Name: `TURBO_TEAM`
   - Value: `[teamId from .turbo/config.json]` (e.g., `tindeveloper` or `team_3Y0hANzD4PovKmUwUyc2WVpb`)
   - Environment: ✅ Production ✅ Preview ✅ Development

#### Option B: Manual Setup (Alternative Method)

If you prefer not to use the CLI:

1. **Get Vercel API Token:**
   - Go to: https://vercel.com/account/tokens
   - Create a new token
   - Copy it → This is your `TURBO_TOKEN`

2. **Get your Team Name:**
   - Your team ID: `tindeveloper` (TIN DEVELOPER CORE)
   - Or use the team ID from Vercel: `team_3Y0hANzD4PovKmUwUyc2WVpb`
   - This is your `TURBO_TEAM`

3. **Add to Vercel Environment Variables** (same as Option A, step 4)

**📖 Detailed instructions**: See `TURBO_CACHE_SETUP.md` or `GET_TURBO_CREDENTIALS_VIA_CLI.md`

#### Verify Variables Are Set:

After adding, verify they appear in the environment variables list for all three environments (Production, Preview, Development).

### Step 3: Verify Other Required Environment Variables

**Required for Build (the build will fail early via `next.config.ts` if missing)**:
- ✅ `DATABASE_URL` - Database connection string
- ✅ `NEXTAUTH_SECRET` - NextAuth secret
- ✅ `CALENDSO_ENCRYPTION_KEY` - Encryption key

**Optional but Recommended**:
- `NEXT_PUBLIC_WEBAPP_URL` - Your app URL
- `NEXT_PUBLIC_WEBSITE_URL` - Your website URL

**Security / CSP**:
- ⚠️ Avoid setting `CSP_POLICY=strict` in **Production**. The config hard-errors in `next.config.ts` for that combination.

**Memory (if build dies during "Optimized production build")**:
- Add Vercel env var: `NODE_OPTIONS=--max_old_space_size=6144`

### Step 4: Verify Build Settings

Go to Vercel Dashboard → Your Project → Settings → General

**Build & Development Settings**:
- Framework Preset: **Next.js** ✅
- Build Command: Should be auto-detected from `vercel.json` or `turbo run build --filter=@calcom/web...`
- Output Directory: `.next` (auto-detected)
- Install Command: Should be `yarn install` (from vercel.json)

### Step 5: Check Build Logs After Deployment

After deploying, check build logs for:

✅ **Good signs**:
```
• Remote caching enabled
@calcom/prisma#post-install: cache hit, executing ...
@calcom/embed-core#build: cache hit, executing ...
```

❌ **Bad signs**:
```
Previous build caches not available
@calcom/prisma#post-install: cache miss, executing ...
@calcom/embed-core#build: cache miss, executing ...
```

## 📊 Expected Performance

- **Before fixes**: ~20 minutes
- **After fixes (first build)**: ~15 minutes (still building, but caching outputs)
- **After fixes (subsequent builds)**: ~5-8 minutes (with cache hits)

## 🐛 Troubleshooting

### Issue: "Previous build caches not available"

**Solution**: 
1. Verify `TURBO_TOKEN` and `TURBO_TEAM` are set in Vercel
2. Check Turbo dashboard to ensure remote cache is enabled
3. First build will always be slower - subsequent builds should be faster

### Issue: Build fails with "turbo.json not found"

**Solution**: 
- Root directory is set to `apps/web` but should be `.` (root)
- Change root directory in Vercel settings

### Issue: Build still takes 20 minutes

**Solution**:
1. Check build logs - are tasks showing "cache hit"?
2. Verify Turbo remote cache credentials
3. Ensure no environment variables changed (which invalidates cache)
4. Check if `schema.prisma` or other inputs changed (which invalidates cache)

## 📝 Summary

**Most Critical Fix**: Ensure root directory is set to `.` (root) in Vercel, NOT `apps/web`

**Code Changes**: Already done ✅
- Enabled caching for Prisma post-install
- Enabled caching for embed-core build
- Updated web build outputs

**Next Steps**:
1. ✅ Verify root directory in Vercel dashboard
2. ✅ Set Turbo remote cache environment variables (see Step 2 above)
3. ✅ Deploy and check build logs
4. ✅ Monitor build times on subsequent deployments

## 🎯 Quick Reference: Your Turbo Credentials

Based on your current setup:

**TURBO_TEAM** (from `.turbo/config.json`):
```
team_3Y0hANzD4PovKmUwUyc2WVpb
```
Or use the team slug: `tindeveloper`

**TURBO_TOKEN**:
- Get from: https://vercel.com/account/tokens
- Create a new token if you don't have one
- Copy it immediately (shown only once)

**Add both to Vercel Environment Variables:**
- Go to: Vercel Dashboard → Your Project → Settings → Environment Variables
- Add `TURBO_TOKEN` = [your Vercel API token]
- Add `TURBO_TEAM` = `team_3Y0hANzD4PovKmUwUyc2WVpb` (or `tindeveloper`)
- Set for: ✅ Production ✅ Preview ✅ Development
