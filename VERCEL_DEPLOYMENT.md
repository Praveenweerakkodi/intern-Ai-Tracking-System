# Vercel Deployment Guide

This guide will help you deploy the InternAI Tracker application to Vercel.

## Prerequisites

1. A Vercel account (https://vercel.com)
2. Your GitHub repository pushed to GitHub
3. All environment variables configured

## Step 1: Connect Your Repository

1. Go to https://vercel.com/new
2. Import your GitHub repository `intern-Ai-Tracking-System`
3. Click "Import"

## Step 2: Configure the Monorepo Settings

Since this is a **Turbo monorepo**, you need to configure Vercel properly:

### In the Vercel Dashboard (Import Project Screen):

1. **Project Name**: Keep as default or change to `internai-web`
2. **Framework Preset**: Select **Next.js**
3. **Root Directory**: Set to `apps/web` (this is important!)
4. **Build Command**: Leave as default or set to `npm run build`
5. **Install Command**: Leave as default (npm install)
6. **Output Directory**: Leave as default (.next)

**Important:** Make sure "Root Directory" is set to `apps/web` - this tells Vercel where your Next.js app is located.

## Step 3: Configure Environment Variables

In the **Environment Variables** section, add:

### Frontend Variables
- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key  
- `NEXT_PUBLIC_APP_URL` - Your app's production URL (e.g., `https://yourdomain.com`)
- `NEXT_PUBLIC_API_URL` - Your API's production URL (e.g., `https://api.yourdomain.com` or `http://localhost:3001`)

### Click "Deploy"

Vercel will now:
1. Install dependencies
2. Build the web app using Turbo
3. Deploy to production

## Step 4: Deploy the API (Separate)

Since your NestJS API is in `apps/api`, you have two options:

### Option A: Deploy to Railway (Recommended for beginners)
1. Go to https://railway.app
2. Connect your GitHub repository
3. Add these environment variables:
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `GEMINI_API_KEY`
   - `JWT_SECRET` (generate: `openssl rand -base64 32`)
   - `NODE_ENV=production`

4. Deploy and get your API URL
5. Update `NEXT_PUBLIC_API_URL` in Vercel to point to your Railway API

### Option B: Deploy API on Vercel Serverless
1. Create a **separate Vercel project** for the API
2. Set Root Directory to `apps/api`
3. Build Command: `npm run build`
4. Get the API URL from Vercel
5. Update `NEXT_PUBLIC_API_URL` in your web app

### Option C: Keep Local Development API
Just update `NEXT_PUBLIC_API_URL` to your local API URL for development testing.

## Step 5: Configure Database (Supabase)

1. Ensure all migrations are applied:
   ```bash
   supabase migration up
   ```

2. Verify Row-Level Security (RLS) policies are enabled in Supabase dashboard

3. Update the Supabase URL and keys if needed in Vercel Environment Variables

## Step 6: Verify Deployment

1. Go to your Vercel project dashboard
2. Click the deployed URL to visit your app
3. Check that:
   - ✅ Pages load correctly
   - ✅ You can navigate the app
   - ✅ API calls work (if API is deployed)

## Troubleshooting

### "No Next.js version detected" Error
- **Cause**: Root Directory not set correctly
- **Fix**: Set Root Directory to `apps/web` in Vercel project settings

### Build fails with missing packages
- **Fix**: Click "Settings" → "Advanced" → "Clear Cache" → "Redeploy"

### Cannot connect to API
- **Check**: 
  1. Verify `NEXT_PUBLIC_API_URL` is correct
  2. Ensure API server is running (if using local API)
  3. Check CORS headers in API configuration
  4. Verify environment variables on API server

### Lost environment variables after redeploy
- **Fix**: They're persisted - just click "Redeploy" in Vercel dashboard

## Monitoring & Optimization

1. **Vercel Analytics**: Built-in performance metrics
2. **Error Tracking**: Configure Sentry or LogRocket
3. **Database Backups**: Enable in Supabase settings
4. **CDN Caching**: Vercel automatically caches static assets

## Production Checklist

- [ ] All API endpoints working
- [ ] Environment variables set in Vercel
- [ ] Database backups configured
- [ ] Error tracking enabled (Sentry, etc.)
- [ ] Custom domain configured (if applicable)
- [ ] HTTPS enabled (automatic with Vercel)
- [ ] Monitoring setup (if needed)

## Support

- Vercel Docs: https://vercel.com/docs
- Next.js Docs: https://nextjs.org/docs  
- Turbo Docs: https://turbo.build/repo/docs
- Railway Docs: https://docs.railway.app

