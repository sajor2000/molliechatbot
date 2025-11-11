# Quick Start Guide

This is a streamlined guide to get your RAG chatbot deployed to Vercel quickly.

## 🚀 5-Minute Setup

### 1. MongoDB Atlas (2 minutes)
1. Go to [mongodb.com/cloud/atlas/register](https://www.mongodb.com/cloud/atlas/register)
2. Create free M0 cluster
3. Create database user with password
4. Allow access from anywhere (0.0.0.0/0)
5. Copy connection string

### 2. Supabase (2 minutes)
1. Go to [supabase.com](https://supabase.com)
2. Create new project
3. Create storage bucket named `documents` (set as public)
4. Copy Project URL and anon key from Settings → API

### 3. Deploy to Vercel (1 minute)
1. Push code to GitHub
2. Import to Vercel
3. Add environment variables (see below)
4. Deploy!

## 🔑 Environment Variables

Copy these to Vercel Project Settings → Environment Variables:

```bash
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DATABASE=mollieweb

# Supabase
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_anon_key

# Pinecone (existing)
PINECONE_API_KEY=your_key
PINECONE_INDEX_NAME=mollieweb-chatbot
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_HOST=https://xxxxx.pinecone.io

# OpenRouter (existing)
OPENROUTER_API_KEY=your_key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
EMBEDDING_DIMENSIONS=512

# Resend (existing)
RESEND_API_KEY=your_key
MANAGER_EMAIL=you@domain.com
FROM_EMAIL=chatbot@yourdomain.com

# Scheduler
TIMEZONE=America/Chicago
SUMMARY_TIME=05:30

# Security
CRON_SECRET=$(openssl rand -base64 32)
```

## ⏰ Set Up Daily Emails

### Option 1: Use cron-job.org (Free, Recommended)
1. Sign up at [cron-job.org](https://cron-job.org)
2. Create job:
   - URL: `https://your-app.vercel.app/api/cron/daily-summary`
   - Schedule: `30 5 * * *`
   - Header: `Authorization: Bearer YOUR_CRON_SECRET`

### Option 2: Use Vercel Cron (Pro Plan Only)
Already configured in `vercel.json` - will work automatically on Pro plan.

## 🌐 Embed on Website

Add to your `shorelinedental.com` HTML:

```html
<script>
  window.MOLLIE_CONFIG = {
    apiUrl: 'https://your-app.vercel.app'
  };
</script>
<script src="https://your-app.vercel.app/embed.js"></script>
```

## ✅ Test Deployment

```bash
# Test chat
curl -X POST https://your-app.vercel.app/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello!"}'

# Test document upload
curl -X POST https://your-app.vercel.app/api/documents/upload \
  -F "document=@test.pdf"

# Trigger summary manually
curl -X POST https://your-app.vercel.app/api/chat/trigger-summary
```

## 📊 Free Tier Limits

| Service | Free Limit | Enough For |
|---------|-----------|------------|
| Vercel | 100 GB bandwidth | ~10K visitors/month |
| MongoDB | 512 MB storage | ~50K conversations |
| Supabase | 1 GB storage | ~1K documents |
| Pinecone | 100K vectors | Thousands of docs |
| Resend | 3K emails/month | 8+ years of daily emails |

**Total Cost: $0/month** ✅

## 🆘 Common Issues

**MongoDB connection fails:**
- Add `0.0.0.0/0` to IP whitelist

**Supabase upload fails:**
- Bucket must be named `documents`
- Bucket must be public
- Use anon key, not service role key

**Cron not working:**
- Check Authorization header matches CRON_SECRET
- Verify cron-job.org timezone settings

**Function timeout:**
- Hobby: 10s max (may need Pro for large uploads)

## 📚 Full Documentation

See [VERCEL_DEPLOYMENT.md](./VERCEL_DEPLOYMENT.md) for complete guide.

## 🎯 Next Steps

1. Upload knowledge base documents
2. Customize chat widget styling
3. Test on shorelinedental.com
4. Verify daily email delivery
5. Set up monitoring alerts

---

**Need help?** Check the full deployment guide or open an issue.
