# Vercel Deployment Setup Guide

## Required Environment Variables

Set these in your Vercel project settings:

### Database Configuration
- `DATABASE_URL` - Your PostgreSQL connection string (e.g., from Vercel Postgres, Supabase, etc.)
- `DATABASE_DIRECT_URL` - **CRITICAL**: Set to the same value as `DATABASE_URL` for direct database connections (required for migrations)

### Application URLs
- `NEXT_PUBLIC_WEBAPP_URL` - Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
- `WEBAPP_URL` - Same as `NEXT_PUBLIC_WEBAPP_URL`
- `NEXTAUTH_URL` - Your deployment URL + `/api/auth` (e.g., `https://your-app.vercel.app/api/auth`)

### Authentication & Security
- `NEXTAUTH_SECRET` - Generate a random secret (e.g., `openssl rand -base64 32`)
- `CALENDSO_ENCRYPTION_KEY` - Generate a random secret (e.g., `openssl rand -base64 32`)
- `MIGRATION_SECRET_TOKEN` - Secret token for running migrations via API (generate with `openssl rand -base64 32`)

## Database Migrations

### Option 1: Automatic Migration (Recommended)

Set `RUN_MIGRATIONS_ON_VERCEL=1` in your Vercel environment variables. This will run migrations during the build process.

**Note**: Ensure `DATABASE_DIRECT_URL` is set and your database is accessible from Vercel's build environment.

### Option 2: Manual Migration via API

After deployment, call the migration endpoint:

```bash
curl -X POST https://your-app.vercel.app/api/migrations/deploy \
  -H "Authorization: Bearer YOUR_MIGRATION_SECRET_TOKEN" \
  -H "Content-Type: application/json"
```

### Option 3: Vercel Deployment Hook

Add a deployment hook in Vercel that calls the migration endpoint automatically after each deployment.

## Comparison: Localhost vs Vercel

### Localhost
- Database: Local PostgreSQL via Docker (port 5434)
- Migrations: Run automatically during build
- Environment: Development

### Vercel
- Database: External PostgreSQL (must be accessible from internet)
- Migrations: Must be configured (see options above)
- Environment: Production

## Troubleshooting

### Migrations Not Running
1. Check that `DATABASE_DIRECT_URL` is set
2. Verify database is accessible from Vercel's IP ranges
3. Check migration logs in Vercel build logs

### Database Connection Errors
1. Ensure `DATABASE_URL` and `DATABASE_DIRECT_URL` are identical
2. Verify database allows connections from Vercel
3. Check connection string format: `postgresql://user:password@host:port/database`

### Build Failures
1. Check that all required environment variables are set
2. Verify Prisma schema is up to date
3. Review build logs for specific errors
