# Localhost vs Vercel Deployment Comparison

## Key Differences

### Database Configuration

**Localhost:**
- `DATABASE_URL`: `postgresql://unicorn_user:magical_password@127.0.0.1:5434/calendso?connect_timeout=10`
- `DATABASE_DIRECT_URL`: `postgresql://unicorn_user:magical_password@127.0.0.1:5434/calendso?connect_timeout=10`
- Database: Local PostgreSQL via Docker (port 5434)
- Migrations: Run automatically during build via `auto-migrations.ts`

**Vercel:**
- `DATABASE_URL`: Should be set to your production database URL
- `DATABASE_DIRECT_URL`: **MUST be set** - same as DATABASE_URL for direct connections
- Database: External PostgreSQL (e.g., Vercel Postgres, Supabase, etc.)
- Migrations: **Skipped during build** - must be run manually via API endpoint

### Migration Process

**Localhost:**
- Migrations run automatically via `packages/prisma/auto-migrations.ts` during `yarn build`
- Uses `yarn prisma migrate deploy`
- All 552 migrations are applied

**Vercel:**
- Migrations are **skipped** during build (see `auto-migrations.ts` line 22-24)
- Must run migrations manually via POST to `/api/migrations/deploy`
- Requires `MIGRATION_SECRET_TOKEN` environment variable

## Required Vercel Environment Variables

1. `DATABASE_URL` - Your PostgreSQL connection string
2. `DATABASE_DIRECT_URL` - Same as DATABASE_URL (required for migrations)
3. `MIGRATION_SECRET_TOKEN` - Secret token for migration API endpoint
4. `NEXTAUTH_URL` - Your Vercel deployment URL + `/api/auth`
5. `NEXT_PUBLIC_WEBAPP_URL` - Your Vercel deployment URL
6. `WEBAPP_URL` - Same as NEXT_PUBLIC_WEBAPP_URL
7. `NEXTAUTH_SECRET` - Secret for NextAuth.js

## Running Migrations on Vercel

After deployment, call the migration endpoint:

```bash
curl -X POST https://your-app.vercel.app/api/migrations/deploy \
  -H "Authorization: Bearer YOUR_MIGRATION_SECRET_TOKEN"
```

Or use Vercel's deployment hooks to automate this.
