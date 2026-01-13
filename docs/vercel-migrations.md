# Database Migrations for Vercel Deployments

## Overview

Database migrations are **intentionally skipped** during Vercel builds to prevent timeouts and ensure builds complete successfully. Migrations should be run separately after deployment.

## Why Migrations Are Skipped During Builds

1. **Build Performance**: Running migrations during builds can cause timeouts (45+ minute limit)
2. **Database Availability**: The database may not be accessible during the build phase
3. **Best Practice**: Separating migrations from builds allows for better error handling and rollback capabilities

## Migration Methods

### Method 1: API Route (Recommended)

A secure API endpoint is available at `/api/migrations/deploy` to run migrations after deployment.

#### Setup

1. Set the `MIGRATION_SECRET_TOKEN` environment variable in Vercel:
   ```bash
   MIGRATION_SECRET_TOKEN=your-secret-token-here
   ```

2. Run migrations via API call:
   ```bash
   curl -X POST https://your-domain.vercel.app/api/migrations/deploy \
     -H "Authorization: Bearer your-secret-token-here"
   ```

#### Using Vercel Deployment Hooks

You can configure a Vercel deployment hook to automatically call this endpoint after successful deployments:

1. Go to your Vercel project settings
2. Navigate to "Deploy Hooks"
3. Create a new hook that calls: `https://your-domain.vercel.app/api/migrations/deploy`
4. Add the `Authorization: Bearer your-secret-token` header

### Method 2: Manual Migration via Vercel CLI

Run migrations manually using the Vercel CLI:

```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Link to your project
vercel link

# Run migrations in production environment
vercel env pull .env.production
yarn workspace @calcom/prisma db-deploy
```

### Method 3: Vercel Cron Job

Set up a cron job in `apps/web/vercel.json` to run migrations periodically:

```json
{
  "crons": [
    {
      "path": "/api/migrations/deploy",
      "schedule": "0 2 * * *"
    }
  ]
}
```

**Note**: This requires the API route to handle GET requests or a separate cron handler.

## Environment Variables Required

Ensure these environment variables are set in Vercel:

- `DATABASE_URL` - Your database connection string
- `DATABASE_DIRECT_URL` - Direct database connection (bypasses connection pooling)
- `MIGRATION_SECRET_TOKEN` - Secret token for API route authentication (if using Method 1)

## Troubleshooting

### Migration Fails During Build

If you see migration-related errors during build, verify that:

1. `SKIP_DB_MIGRATIONS` is not set (or set to "0")
2. The `auto-migrations.ts` script is properly skipping migrations in Vercel builds
3. Check build logs for "Build environment detected, skipping migrations" message

### Migration API Returns 401/403

- Verify `MIGRATION_SECRET_TOKEN` is set in Vercel environment variables
- Ensure the Authorization header format is correct: `Bearer your-token`
- Check that the token matches exactly (no extra spaces)

### Migration API Returns 500

- Verify `DATABASE_URL` and `DATABASE_DIRECT_URL` are set
- Check database connectivity from Vercel's network
- Review API route logs in Vercel dashboard

## Best Practices

1. **Always test migrations locally first**: `yarn workspace @calcom/prisma db-migrate`
2. **Run migrations during low-traffic periods** if possible
3. **Monitor migration execution** via Vercel function logs
4. **Have a rollback plan** ready before running migrations in production
5. **Use `db-deploy` for production** (not `db-migrate`) - it's safer and doesn't create new migrations

## Related Commands

- **Development**: `yarn workspace @calcom/prisma db-migrate`
- **Production**: `yarn workspace @calcom/prisma db-deploy`
- **Check status**: `yarn prisma migrate status`
