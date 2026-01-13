# Vercel Environment Variables Configuration

## Required Environment Variables for Vercel Deployment

Copy these to your Vercel project settings → Environment Variables:

### Database Configuration
```bash
DATABASE_URL="postgresql://postgres:vv6Fdl4xOGTTUTF8@db.grvmdhsntdghxdiastot.supabase.co:5432/postgres"
```

### Authentication Secrets
```bash
NEXTAUTH_SECRET="eF5SuJ1bn2E/Q4fApcp948gkjUrbgNyuQUAia5jyxRU="
CALENDSO_ENCRYPTION_KEY="al1RVr9euUdSGwWarY4tyEidmjCgKsCU"
```

### API Keys
```bash
CRON_API_KEY="763a0b9d332ed627c8663e65aae7177e"
```

### Application URLs (Update with your Vercel domain)
```bash
NEXT_PUBLIC_WEBAPP_URL="https://your-app.vercel.app"
NEXTAUTH_URL="https://your-app.vercel.app/api/auth"
```

### Supabase Credentials (if needed for integrations)
```bash
SUPABASE_URL="https://grvmdhsntdghxdiastot.supabase.co"
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdydm1kaHNudGRnaHhkaWFzdG90Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgyNjMxMzcsImV4cCI6MjA4MzgzOTEzN30.ufmq4ovkdR56lBwnaF1LqAu-yur-jbEDFfxkV6W_2a0"
SUPABASE_SERVICE_ROLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imdydm1kaHNudGRnaHhkaWFzdG90Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2ODI2MzEzNywiZXhwIjoyMDgzODM5MTM3fQ.8Fir69UZzqc-n6Npdsus-8M64fXr1Afji4vDbvTQtCU"
```

## Vercel Project Settings

- **Root Directory**: `apps/web`
- **Build Command**: `cd ../.. && yarn build`
- **Install Command**: `yarn install` (or `YARN_ENABLE_IMMUTABLE_INSTALLS=false yarn install` if needed)

## Next Steps

1. Go to Vercel Dashboard → Your Project → Settings → Environment Variables
2. Add all the variables above
3. Update `NEXT_PUBLIC_WEBAPP_URL` and `NEXTAUTH_URL` with your actual Vercel domain after first deployment
4. Deploy!

