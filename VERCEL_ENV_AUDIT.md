# Vercel Environment Variables Audit Report

**Date**: Generated automatically  
**Status**: ⚠️ Issues Found

## Summary

Comparison between Vercel environment variables and local `.env` files revealed **5 variables with trailing newlines (`\n`)** that need to be fixed.

## Issues Found

### Variables with Trailing Newlines

The following variables in Vercel have literal `\n` characters at the end of their values:

1. **CALENDSO_ENCRYPTION_KEY**
   - Current: `zeN3qo30IufqNcMoBW72qzSTmmJO+XfUZlSNzTeLzwE=\n`
   - Should be: `zeN3qo30IufqNcMoBW72qzSTmmJO+XfUZlSNzTeLzwE=`

2. **MIGRATION_SECRET_TOKEN**
   - Current: `iATeDD52kY6yGm/YXu1iJ3q/RjRO9/+7S6gydbGv6FY=\n`
   - Should be: `iATeDD52kY6yGm/YXu1iJ3q/RjRO9/+7S6gydbGv6FY=`

3. **NEXTAUTH_SECRET**
   - Current: `IXSK1VDL4It4GpW2j1Pk/VzpOzhBwfLszxjCHHNG+RM=\n`
   - Should be: `IXSK1VDL4It4GpW2j1Pk/VzpOzhBwfLszxjCHHNG+RM=`

4. **TURBO_TEAM**
   - Current: `team_3Y0hANzD4PovKmUwUyc2WVpb\n`
   - Should be: `team_3Y0hANzD4PovKmUwUyc2WVpb`

5. **TURBO_TOKEN**
   - Current: `trpHirlEGtvXIFNQJ6nHXK7M\n`
   - Should be: `trpHirlEGtvXIFNQJ6nHXK7M`

## How to Fix

### Option 1: Vercel Dashboard (Recommended)

1. Go to: https://vercel.com/[your-team]/[your-project]/settings/environment-variables
2. For each variable listed above:
   - Click on the variable
   - Copy the cleaned value (without `\n`) shown above
   - Paste it into Vercel (ensure no trailing spaces)
   - Select all environments (Production, Preview, Development)
   - Save

### Option 2: Vercel CLI

Run these commands for each variable:

```bash
# Fix CALENDSO_ENCRYPTION_KEY
vercel env rm CALENDSO_ENCRYPTION_KEY production --yes
echo "zeN3qo30IufqNcMoBW72qzSTmmJO+XfUZlSNzTeLzwE=" | vercel env add CALENDSO_ENCRYPTION_KEY production
vercel env rm CALENDSO_ENCRYPTION_KEY preview --yes
echo "zeN3qo30IufqNcMoBW72qzSTmmJO+XfUZlSNzTeLzwE=" | vercel env add CALENDSO_ENCRYPTION_KEY preview
vercel env rm CALENDSO_ENCRYPTION_KEY development --yes
echo "zeN3qo30IufqNcMoBW72qzSTmmJO+XfUZlSNzTeLzwE=" | vercel env add CALENDSO_ENCRYPTION_KEY development

# Fix MIGRATION_SECRET_TOKEN
vercel env rm MIGRATION_SECRET_TOKEN production --yes
echo "iATeDD52kY6yGm/YXu1iJ3q/RjRO9/+7S6gydbGv6FY=" | vercel env add MIGRATION_SECRET_TOKEN production
vercel env rm MIGRATION_SECRET_TOKEN preview --yes
echo "iATeDD52kY6yGm/YXu1iJ3q/RjRO9/+7S6gydbGv6FY=" | vercel env add MIGRATION_SECRET_TOKEN preview
vercel env rm MIGRATION_SECRET_TOKEN development --yes
echo "iATeDD52kY6yGm/YXu1iJ3q/RjRO9/+7S6gydbGv6FY=" | vercel env add MIGRATION_SECRET_TOKEN development

# Fix NEXTAUTH_SECRET
vercel env rm NEXTAUTH_SECRET production --yes
echo "IXSK1VDL4It4GpW2j1Pk/VzpOzhBwfLszxjCHHNG+RM=" | vercel env add NEXTAUTH_SECRET production
vercel env rm NEXTAUTH_SECRET preview --yes
echo "IXSK1VDL4It4GpW2j1Pk/VzpOzhBwfLszxjCHHNG+RM=" | vercel env add NEXTAUTH_SECRET preview
vercel env rm NEXTAUTH_SECRET development --yes
echo "IXSK1VDL4It4GpW2j1Pk/VzpOzhBwfLszxjCHHNG+RM=" | vercel env add NEXTAUTH_SECRET development

# Fix TURBO_TEAM
vercel env rm TURBO_TEAM production --yes
echo "team_3Y0hANzD4PovKmUwUyc2WVpb" | vercel env add TURBO_TEAM production
vercel env rm TURBO_TEAM preview --yes
echo "team_3Y0hANzD4PovKmUwUyc2WVpb" | vercel env add TURBO_TEAM preview
vercel env rm TURBO_TEAM development --yes
echo "team_3Y0hANzD4PovKmUwUyc2WVpb" | vercel env add TURBO_TEAM development

# Fix TURBO_TOKEN
vercel env rm TURBO_TOKEN production --yes
echo "trpHirlEGtvXIFNQJ6nHXK7M" | vercel env add TURBO_TOKEN production
vercel env rm TURBO_TOKEN preview --yes
echo "trpHirlEGtvXIFNQJ6nHXK7M" | vercel env add TURBO_TOKEN preview
vercel env rm TURBO_TOKEN development --yes
echo "trpHirlEGtvXIFNQJ6nHXK7M" | vercel env add TURBO_TOKEN development
```

## Comparison Summary

- **Variables in Vercel only**: 2 (TURBO_TEAM, TURBO_TOKEN)
- **Variables in Local only**: 200+ (mostly development/testing variables)
- **Variables with different values**: 3 (CALENDSO_ENCRYPTION_KEY, NEXTAUTH_SECRET, VERCEL_OIDC_TOKEN)
- **Variables matching**: 1 (MIGRATION_SECRET_TOKEN - but has trailing `\n` in Vercel)

## Additional Notes

- **VERCEL_OIDC_TOKEN** has different values between Vercel and local, but this is expected as it's a time-limited token
- Most local-only variables are for development/testing and don't need to be in Vercel
- After fixing the trailing newlines, **redeploy your application** to ensure the changes take effect

## Scripts Available

Two scripts have been created to help with this:

1. **`scripts/compare-env-vars.js`** - Compare Vercel and local env vars
2. **`scripts/fix-vercel-env-trailing-spaces.js`** - Identify and provide fix instructions for trailing whitespace issues

Run them with:
```bash
node scripts/compare-env-vars.js
node scripts/fix-vercel-env-trailing-spaces.js
```
