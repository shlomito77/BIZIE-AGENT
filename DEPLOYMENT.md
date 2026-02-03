# ��� BIZIE Secure Deployment Guide

## ��� Security Architecture

```
┌─────────────┐         ┌──────────────────┐         ┌─────────────┐
│   Browser   │ ─────►  │  Vercel Backend  │ ─────►  │  Gemini API │
│  (Frontend) │         │  (Serverless)    │         │             │
└─────────────┘         └──────────────────┘         └─────────────┘
                               ↑
                        API KEY stored here
                        (NOT exposed to browser!)
```

## ��� Prerequisites

1. **Vercel Account** (free): https://vercel.com/signup
2. **Gemini API Key**: https://makersuite.google.com/app/apikey
3. **Git repository** on GitHub

## ��� Deployment Steps

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Login to Vercel

```bash
vercel login
```

### Step 3: Deploy Project

```bash
# From project root
vercel
```

Follow the prompts:
- Link to existing project? **No**
- Project name? **bizie-agent**
- Directory? **./** (current directory)
- Override settings? **No**

### Step 4: Add Environment Variables

Go to your Vercel dashboard:
1. Select your project
2. Go to **Settings** → **Environment Variables**
3. Add these variables:

| Name | Value | Environment |
|------|-------|-------------|
| `GEMINI_API_KEY` | Your Gemini API key | Production, Preview, Development |
| `POSTGRES_URL` | Postgres connection string | Production, Preview, Development |
| `ALLOWED_ORIGINS` | Comma-separated domains (e.g., `https://bizie.vercel.app`) | Production, Preview, Development |
| `BASIC_AUTH_USER` | Admin username | Production, Preview, Development |
| `BASIC_AUTH_PASS` | Admin password | Production, Preview, Development |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | Production, Preview, Development |
| `ALLOWED_ADMIN_EMAILS` | Comma-separated allowed emails | Production, Preview, Development |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID (frontend) | Production, Preview, Development |
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Production, Preview, Development |
| `TELEGRAM_ALLOWED_CHAT_IDS` | Comma-separated Chat IDs | Production, Preview, Development |
| `TELEGRAM_SECRET_TOKEN` | Telegram webhook secret token | Production, Preview, Development |
| `UPSTASH_REDIS_REST_URL` | Upstash Redis REST URL | Production, Preview, Development |
| `UPSTASH_REDIS_REST_TOKEN` | Upstash Redis REST token | Production, Preview, Development |
| `SENTRY_DSN` | Sentry DSN (backend) | Production, Preview, Development |
| `VITE_SENTRY_DSN` | Sentry DSN (frontend) | Production, Preview, Development |

### Step 5: Redeploy

```bash
vercel --prod
```

## PWA Install (Optional)

After deploy, open the app URL on device:

- **Android (Chrome)**: Menu -> Install app
- **iOS (Safari)**: Share -> Add to Home Screen

PWA requires HTTPS and a public URL (Vercel provides both).

### Step 6: Update Frontend Code

If using the old `gemini.ts`, replace imports:

```typescript
// OLD (insecure):
import { gemini } from '../services/gemini';

// NEW (secure):
import { secureGemini as gemini } from '../services/geminiSecure';
```

## ✅ Verification

Test your deployed API:

```bash
curl -X POST https://your-app.vercel.app/api/gemini \
  -H "Content-Type: application/json" \
  -d '{
    "contents": [{"role": "user", "parts": [{"text": "שלום"}]}],
    "business": {"name": "Test", "services": []}
  }'
```

Should return a valid response!

## ��� Local Development

For local testing with backend:

```bash
# Install Vercel CLI
npm install -g vercel

# Run locally with serverless functions
vercel dev
```

This will:
- Start Vite frontend on http://localhost:3000
- Run API functions locally
- Load environment variables from `.env.local`

## ��� Troubleshooting

### API returns 500 error
- Check Vercel logs: `vercel logs`
- Verify `GEMINI_API_KEY` is set correctly
- Check API key has correct permissions

### CORS errors
- Verify `ALLOWED_ORIGINS` matches your frontend URL
- Check `vercel.json` CORS configuration

### Google Sign-In fails
- Ensure `GOOGLE_CLIENT_ID` and `VITE_GOOGLE_CLIENT_ID` are the same
- Add your domain to OAuth "Authorized JavaScript origins"
- Populate `ALLOWED_ADMIN_EMAILS`

### Rate limit errors
- Current limit: 60 requests/minute per IP
- Configure Upstash Redis for production rate limiting

### Monitoring
- Set `SENTRY_DSN` + `VITE_SENTRY_DSN` to enable error tracking

### Backups
- Call `GET /api/backup` with Basic Auth to export JSON
- Example: `BIZIE_BACKUP_URL=https://your-app.vercel.app BASIC_AUTH_USER=... BASIC_AUTH_PASS=... ./tools/backup.sh`

## ��� Monitoring

View logs and analytics:
```bash
vercel logs --follow
```

Or in Vercel Dashboard:
- **Deployments** → Select deployment → **View Logs**
- **Analytics** tab for usage stats

## ��� Cost Estimation

- **Vercel**: Free tier includes 100GB bandwidth, unlimited serverless function invocations
- **Gemini API**: Pay per token usage (check Google's pricing)

## ��� Security Best Practices

✅ **DO:**
- Keep API keys in Vercel environment variables
- Use CORS to restrict API access
- Implement rate limiting
- Monitor API usage

❌ **DON'T:**
- Commit `.env.local` to git
- Share API keys
- Disable CORS in production
- Ignore rate limiting

## ��� Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Serverless Functions](https://vercel.com/docs/functions)
- [Gemini API Docs](https://ai.google.dev/docs)

---

**Questions?** Check the troubleshooting section or open an issue on GitHub.
