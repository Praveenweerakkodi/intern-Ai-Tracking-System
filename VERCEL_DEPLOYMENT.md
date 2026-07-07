# Vercel Deployment Guide

This guide will help you deploy the InternAI Tracker application to Vercel.

## Prerequisites

1. A Vercel account (https://vercel.com)
2. Your GitHub repository pushed to GitHub
3. All environment variables configured

## Step 1: Set Up Vercel Project

### Option A: Using Vercel CLI
```bash
npm install -g vercel
vercel
```

### Option B: Using Vercel Dashboard
1. Go to https://vercel.com/new
2. Import your GitHub repository
3. Select the project root

## Step 2: Configure Environment Variables

In your Vercel project settings, add these environment variables:

### Frontend (web app)
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `NEXT_PUBLIC_APP_URL` - Your app's production URL (e.g., https://yourdomain.com)
- `NEXT_PUBLIC_API_URL` - Your API's production URL (e.g., https://api.yourdomain.com)

### Backend (API)
- `SUPABASE_SERVICE_ROLE_KEY` - Your Supabase service role key
- `GEMINI_API_KEY` - Your Google Gemini API key
- `JWT_SECRET` - A secure JWT secret (generate with: `openssl rand -base64 32`)
- `NODE_ENV` - Set to `production`
- `PORT` - Set to `3001` (Vercel will override this)

## Step 3: Build Configuration

The project uses Turbo monorepo. Vercel automatically detects this, but ensure:

1. **Root Package Manager**: npm is selected
2. **Build Command**: `turbo run build` (usually auto-detected)
3. **Framework**: Select "Other" or "Monorepos"

## Step 4: API Deployment

Since you have a NestJS API, you may need to deploy it separately:

### Option A: Deploy to Vercel Serverless
Add `vercel.json` at root (already created):
```json
{
  "builds": [
    { "src": "apps/api/package.json", "use": "@vercel/node" },
    { "src": "apps/web/package.json", "use": "@vercel/next" }
  ]
}
```

### Option B: Deploy to Railway, Heroku, or other Node.js hosts
Configure the API environment variables on your chosen platform and update `NEXT_PUBLIC_API_URL` accordingly.

## Step 5: Database Setup

1. **Supabase**: Ensure your database migrations are applied
   ```bash
   supabase migration up
   ```

2. **RLS Policies**: Verify Row-Level Security policies are enabled in Supabase dashboard

## Step 6: Deploy

### Using Vercel CLI
```bash
vercel --prod
```

### Using GitHub Integration
Push to your main branch - Vercel will automatically deploy!

## Troubleshooting

### Build Fails with Module Not Found
- Clear cache: In Vercel dashboard → Settings → Advanced → Clear Cache
- Rebuild: Click "Redeploy" button

### API Connection Issues
- Check `NEXT_PUBLIC_API_URL` is correct
- Verify API is running and accessible
- Check CORS settings in API

### Missing Environment Variables
- Ensure all env vars from `.env.example` are set in Vercel
- Click "Redeploy" after adding new variables

### Deprecated Package Warnings
- These are now fixed with multer 2.x upgrade
- Run: `npm audit fix` to resolve any remaining issues

## Monitoring

After deployment:
1. Check Vercel Analytics: https://vercel.com/dashboard
2. Monitor API logs in your API hosting platform
3. Set up error tracking (e.g., Sentry, LogRocket)

## Performance Optimization

1. **Enable Edge Functions**: Vercel → Settings → Edge Functions
2. **Use ISR**: Implement Incremental Static Regeneration in Next.js
3. **CDN Caching**: Configure cache headers for assets
4. **Database**: Consider read replicas for Supabase if scaling

## Support

For issues, check:
- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs
- NestJS Docs: https://docs.nestjs.com
