# Vercel Build Optimization Guide

This guide explains the optimizations implemented to reduce Vercel build times and prevent timeouts.

## Optimizations Implemented

### 1. Turbo Remote Caching

Turbo remote caching significantly speeds up builds by reusing build artifacts from previous builds.

#### Setup Instructions

1. **Create a Turbo account** (if you don't have one):
   - Go to https://turbo.build
   - Sign up for a free account
   - Create a team or use your personal account

2. **Get your Turbo token**:
   - Go to your Turbo dashboard
   - Navigate to Settings → Tokens
   - Create a new token

3. **Add environment variables in Vercel**:
   - Go to your Vercel project settings
   - Navigate to "Environment Variables"
   - Add the following:
     ```
     TURBO_TOKEN=your-turbo-token-here
     TURBO_TEAM=your-team-name-or-username
     ```

4. **Verify setup**:
   - After adding the variables, trigger a new build
   - Check build logs for "Remote cache hit" messages
   - Subsequent builds should be significantly faster

### 2. Optimized Build Dependencies

The `turbo.json` configuration has been optimized with:

- **Input specifications**: Only rebuild when relevant files change
- **Output caching**: Proper cache keys for build artifacts
- **Dependency optimization**: Parallel builds where possible

#### Key Optimizations

- `@calcom/web#build`: Only rebuilds when app files, configs, or dependencies change
- `@calcom/trpc#build`: Cached with proper inputs/outputs
- `post-install`: Cached Prisma client generation
- Build tasks have explicit inputs to avoid unnecessary rebuilds

### 3. Vercel Build Settings

The `apps/web/vercel.json` has been configured with:

- **Explicit build command**: `turbo run build --filter=@calcom/web...`
- **Framework detection**: Next.js framework preset
- **Function timeouts**: Optimized for migration API route

### 4. Database Migration Separation

Migrations are now completely separated from the build process:

- ✅ Migrations skipped during builds (prevents timeouts)
- ✅ Secure API endpoint for running migrations separately
- ✅ Documentation for migration workflows

See [vercel-migrations.md](./vercel-migrations.md) for details.

## Expected Build Time Improvements

With these optimizations:

- **First build**: Similar to before (no cache)
- **Subsequent builds**: 50-80% faster (with Turbo cache)
- **Incremental builds**: 70-90% faster (only changed packages rebuild)

## Monitoring Build Performance

### Check Turbo Cache Hits

In Vercel build logs, look for:
```
✓ Remote cache hit
✓ Local cache hit
```

### Build Time Metrics

Monitor build times in:
- Vercel Dashboard → Deployments → Build Logs
- Look for "Build Completed" timestamps

### Troubleshooting Slow Builds

1. **Check cache hit rate**:
   - Low cache hits = first build or major changes
   - High cache hits = incremental builds (should be fast)

2. **Verify Turbo credentials**:
   - Ensure `TURBO_TOKEN` and `TURBO_TEAM` are set correctly
   - Check token hasn't expired

3. **Review build logs**:
   - Look for packages rebuilding unnecessarily
   - Check for errors that might cause full rebuilds

4. **Check for breaking changes**:
   - Major dependency updates can invalidate cache
   - Schema changes invalidate Prisma cache

## Additional Optimizations

### Enable Vercel Enhanced Builds (Optional)

For even faster builds, consider enabling Enhanced Builds in Vercel:

1. Go to Project Settings → General
2. Enable "Enhanced Builds"
3. This provides more CPU/memory resources

**Note**: Enhanced Builds may require a Vercel Pro plan or higher.

### Optimize Dependencies

Regular maintenance:

1. **Update dependencies**: Keep packages up to date
2. **Remove unused packages**: Reduce build size
3. **Use production builds**: Ensure dev dependencies aren't included

### Monitor Bundle Size

Use Next.js bundle analyzer:

```bash
ANALYZE=true yarn build
```

This helps identify large dependencies that slow builds.

## Environment Variables Checklist

Ensure these are set in Vercel:

### Required for Builds
- `DATABASE_URL` (for Prisma generation, not migrations)
- `DATABASE_DIRECT_URL` (for Prisma generation)
- `NEXTAUTH_SECRET`
- `NEXTAUTH_URL`

### Required for Turbo Caching
- `TURBO_TOKEN`
- `TURBO_TEAM`

### Optional but Recommended
- `SKIP_DB_MIGRATIONS=1` (explicitly skip migrations)
- `NODE_ENV=production`

### For Migrations (separate from builds)
- `MIGRATION_SECRET_TOKEN` (for API route)

## Best Practices

1. **Commit frequently**: Smaller commits = better cache hits
2. **Use feature branches**: Test builds before merging
3. **Monitor build times**: Set up alerts for slow builds
4. **Review logs**: Check for warnings or errors
5. **Keep dependencies updated**: Avoid major version jumps

## Troubleshooting

### Build Still Timing Out

1. Check if Turbo caching is working (look for cache hits)
2. Verify Enhanced Builds are enabled (if available)
3. Review build logs for specific slow steps
4. Consider splitting the monorepo if consistently timing out

### Cache Not Working

1. Verify `TURBO_TOKEN` and `TURBO_TEAM` are set
2. Check token permissions in Turbo dashboard
3. Ensure team name matches exactly (case-sensitive)
4. Try clearing cache and rebuilding

### Migration Errors

See [vercel-migrations.md](./vercel-migrations.md) for migration troubleshooting.

## Support

For issues or questions:
- Check Vercel build logs
- Review Turbo documentation: https://turbo.build/docs
- Check Cal.com GitHub issues
