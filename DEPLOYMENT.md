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
| `TELEGRAM_BOT_TOKEN` | Telegram bot token | Production, Preview, Development |
| `TELEGRAM_ALLOWED_CHAT_IDS` | Comma-separated Chat IDs | Production, Preview, Development |
| `TELEGRAM_SECRET_TOKEN` | Telegram webhook secret token | Production, Preview, Development |

### Step 5: Redeploy

```bash
vercel --prod
```

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

### Rate limit errors
- Current limit: 20 requests/minute per IP
- Increase in `api/gemini.ts` if needed

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
