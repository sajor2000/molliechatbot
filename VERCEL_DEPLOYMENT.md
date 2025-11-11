# Vercel Deployment Guide

This guide will walk you through deploying your RAG chatbot to Vercel with MongoDB Atlas for storage and automated daily email summaries.

## Architecture Overview

```
┌─────────────────────────────────────────────┐
│         Vercel Serverless Functions          │
│  (Chat, Documents, Cron endpoints)           │
└─────────────────────────────────────────────┘
            │
    ┌───────┼───────────┬──────────────┐
    │       │           │              │
    ▼       ▼           ▼              ▼
┌────────┐  ┌────────┐  ┌─────────┐  ┌──────────┐
│MongoDB │  │Supabase│  │Pinecone │  │OpenRouter│
│ Atlas  │  │Storage │  │ Vector  │  │   API    │
│(Convos)│  │ (Docs) │  │   DB    │  │   (AI)   │
└────────┘  └────────┘  └─────────┘  └──────────┘

    ┌───────────────────────────────┐
    │    cron-job.org (Scheduler)   │
    │    Triggers: /api/cron/...    │
    └───────────────────────────────┘
```

## Prerequisites

1. **Vercel Account** (Free tier works)
   - Sign up at [vercel.com](https://vercel.com)

2. **MongoDB Atlas Account** (Free tier: 512 MB)
   - Sign up at [mongodb.com/cloud/atlas](https://www.mongodb.com/cloud/atlas)

3. **Supabase Account** (Free tier: 1 GB storage)
   - Sign up at [supabase.com](https://supabase.com)

4. **Pinecone Account** (Free tier: 100K vectors)
   - Already configured in your project

5. **OpenRouter API Key**
   - Already configured in your project

6. **Resend Account** (Free tier: 3,000 emails/month)
   - Already configured in your project

## Step 1: Set Up MongoDB Atlas

### 1.1 Create a Free Cluster

1. Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. Click "Build a Database"
3. Choose "FREE" (M0 Sandbox - 512 MB)
4. Select your preferred cloud provider and region (closest to your users)
5. Name your cluster (e.g., "mollieweb-cluster")
6. Click "Create"

### 1.2 Create Database User

1. In Security → Database Access
2. Click "Add New Database User"
3. Choose "Password" authentication
4. Set username and password (save these!)
5. Set role to "Read and write to any database"
6. Click "Add User"

### 1.3 Configure Network Access

1. In Security → Network Access
2. Click "Add IP Address"
3. Click "Allow Access from Anywhere" (for Vercel)
   - This adds `0.0.0.0/0` which allows Vercel's dynamic IPs
4. Click "Confirm"

### 1.4 Get Connection String

1. Click "Connect" on your cluster
2. Choose "Connect your application"
3. Copy the connection string (looks like: `mongodb+srv://username:<password>@cluster.mongodb.net/`)
4. Replace `<password>` with your actual password
5. Save this for environment variables

**Example:**
```
mongodb+srv://mollieweb:MySecurePass123@mollieweb-cluster.abc123.mongodb.net/
```

## Step 2: Set Up Supabase

### 2.1 Create a New Project

1. Go to [Supabase](https://supabase.com)
2. Click "New Project"
3. Choose your organization (or create one)
4. Set project name: "mollieweb-docs"
5. Set a strong database password (save this!)
6. Choose region closest to your users
7. Click "Create new project"
8. Wait for setup (2-3 minutes)

### 2.2 Create Storage Bucket

1. Go to Storage in left sidebar
2. Click "New bucket"
3. Name: `documents`
4. Set to **Public** bucket (for easy access)
5. Click "Create bucket"

### 2.3 Set Storage Policies (Optional but Recommended)

1. Click on the "documents" bucket
2. Go to "Policies" tab
3. Add policy for uploads:
   - Name: "Allow authenticated uploads"
   - Type: INSERT
   - Target roles: authenticated
   - Policy: `true`
4. Add policy for reads:
   - Name: "Public read access"
   - Type: SELECT
   - Target roles: public
   - Policy: `true`

### 2.4 Get API Credentials

1. Go to Settings → API
2. Copy these values:
   - **Project URL** (e.g., `https://abcdefgh.supabase.co`)
   - **anon/public key** (under "Project API keys")

## Step 3: Prepare for Deployment

### 3.1 Install Dependencies

```bash
cd /Users/JCR/Downloads/mollieweb
npm install
```

### 3.2 Test Locally (Optional)

Create a `.env` file based on `.env.example`:

```bash
cp .env.example .env
```

Fill in your credentials and test:

```bash
npm run dev
```

## Step 4: Deploy to Vercel

### 4.1 Initialize Git Repository (if not already)

```bash
git init
git add .
git commit -m "Initial commit with Vercel migration"
```

### 4.2 Push to GitHub

1. Create a new repository on GitHub
2. Follow GitHub's instructions to push:

```bash
git remote add origin https://github.com/yourusername/mollieweb.git
git branch -M main
git push -u origin main
```

### 4.3 Import to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Click "Add New" → "Project"
3. Import your GitHub repository
4. Vercel will auto-detect the configuration

### 4.4 Configure Environment Variables

In Vercel project settings, add these environment variables:

#### MongoDB
```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DATABASE=mollieweb
```

#### Supabase
```
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here
```

#### Pinecone (existing)
```
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=mollieweb-chatbot
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_HOST=https://your-index.svc.pinecone.io
```

#### OpenRouter (existing)
```
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
EMBEDDING_DIMENSIONS=512
```

#### Resend (existing)
```
RESEND_API_KEY=your_resend_api_key
MANAGER_EMAIL=your-email@domain.com
FROM_EMAIL=chatbot@yourdomain.com
```

#### Scheduler
```
TIMEZONE=America/Chicago
SUMMARY_TIME=05:30
```

#### Cron Secret
Generate a secure random string:
```bash
openssl rand -base64 32
```
Then add:
```
CRON_SECRET=your_generated_secret_here
```

### 4.5 Deploy

Click "Deploy" and wait for deployment to complete (2-5 minutes).

Your app will be live at: `https://your-project.vercel.app`

## Step 5: Set Up Cron Job (External Scheduler)

Since Vercel's Hobby plan has limitations, we'll use cron-job.org (free) to trigger our endpoint.

### 5.1 Create cron-job.org Account

1. Go to [cron-job.org](https://cron-job.org)
2. Sign up for free account
3. Verify your email

### 5.2 Create Cron Job

1. Click "Create cronjob"
2. Configure:
   - **Title**: "Mollieweb Daily Summary"
   - **URL**: `https://your-project.vercel.app/api/cron/daily-summary`
   - **Schedule**:
     - Custom: `30 5 * * *` (5:30 AM daily)
     - Or use visual picker
   - **Timezone**: Select your timezone (e.g., America/Chicago)
   - **HTTP Method**: GET
   - **Headers**: Click "Add header"
     - Name: `Authorization`
     - Value: `Bearer your_cron_secret_here` (the one you set in Vercel)
3. Enable "Save responses"
4. Click "Create cronjob"

### 5.3 Test the Cron Job

Click the "Execute now" button to test. Check:
- Response status should be 200
- Check your email for the summary

## Step 6: Embed Chat Widget on Website

### 6.1 Update Widget Configuration

In your website HTML (shorelinedental.com), add:

```html
<!-- Mollieweb Chatbot Widget -->
<script>
  window.MOLLIE_CONFIG = {
    apiUrl: 'https://your-project.vercel.app',
    position: 'bottom-right',
    primaryColor: '#4F46E5',
    greeting: 'Hi! How can I help you today?'
  };
</script>
<script src="https://your-project.vercel.app/embed.js"></script>
```

### 6.2 Customize Embed Script (if needed)

The `public/embed.js` file can be customized for your website's styling and behavior.

## Step 7: Verify Deployment

### 7.1 Test Chat Endpoint

```bash
curl -X POST https://your-project.vercel.app/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, what services do you offer?"}'
```

Expected response:
```json
{
  "response": "...",
  "sessionId": "...",
  "context": "..."
}
```

### 7.2 Test Document Upload

```bash
curl -X POST https://your-project.vercel.app/api/documents/upload \
  -F "document=@/path/to/test.pdf"
```

### 7.3 Test Manual Summary Trigger

```bash
curl -X POST https://your-project.vercel.app/api/chat/trigger-summary
```

### 7.4 Monitor Logs

In Vercel Dashboard:
1. Go to your project
2. Click "Logs" tab
3. Monitor real-time logs for errors

## Monitoring and Maintenance

### Check Usage

**Vercel:**
- Dashboard → Usage
- Monitor: Function invocations, bandwidth, build minutes

**MongoDB Atlas:**
- Cluster → Metrics
- Monitor: Storage usage, connections, operations

**Supabase:**
- Dashboard → Usage
- Monitor: Storage, database size, bandwidth

**Pinecone:**
- Dashboard → Usage
- Monitor: Vector count, queries

### Set Up Alerts

**Vercel:**
1. Project Settings → Notifications
2. Enable "Deploy failed" and "Over usage" alerts

**MongoDB:**
1. Alerts → Create Alert
2. Set threshold at 80% of 512 MB

**Supabase:**
1. Settings → Notifications
2. Enable storage alerts

### Backup Strategy

**Conversations (MongoDB):**
```bash
# Manual backup script
mongodump --uri="mongodb+srv://..." --db=mollieweb --out=./backup
```

**Documents (Supabase):**
- Built-in point-in-time recovery (Pro plan)
- Free tier: Manual exports via dashboard

## Troubleshooting

### Issue: Cron job returns 401

**Solution:** Check that the Authorization header matches your CRON_SECRET exactly.

### Issue: MongoDB connection timeout

**Solution:** Verify that `0.0.0.0/0` is in Network Access IP whitelist.

### Issue: Document upload fails

**Solution:**
1. Check Supabase bucket exists and is public
2. Verify SUPABASE_KEY is the anon/public key, not service role
3. Check file size < 10 MB

### Issue: Function timeout

**Solution:**
- Hobby plan: 10s limit
- Upgrade to Pro for 60s limit
- Optimize document processing for large files

### Issue: Email not sending

**Solution:**
1. Verify Resend API key
2. Check FROM_EMAIL domain is verified in Resend
3. Check MANAGER_EMAIL is correct

## Cost Optimization Tips

1. **Archive old conversations** (MongoDB)
   ```typescript
   await mongodbService.deleteOldConversations(90); // Keep 90 days
   ```

2. **Set document lifecycle** (Supabase)
   - Delete old documents after X days

3. **Monitor Pinecone vectors**
   - Periodically clean up unused vectors

4. **Optimize images/assets**
   - Compress before upload
   - Use CDN caching

## Scaling Considerations

When you outgrow free tier:

| Service | Free Tier Limit | Upgrade Cost | When to Upgrade |
|---------|----------------|--------------|-----------------|
| Vercel | 100 GB bandwidth | $20/month Pro | High traffic site |
| MongoDB | 512 MB | $9/month (2 GB) | ~50K conversations |
| Supabase | 1 GB storage | $25/month | ~1K documents |
| Pinecone | 100K vectors | Custom pricing | More documents |

## Support and Resources

- **Vercel Docs**: [vercel.com/docs](https://vercel.com/docs)
- **MongoDB Atlas**: [docs.atlas.mongodb.com](https://docs.atlas.mongodb.com)
- **Supabase Docs**: [supabase.com/docs](https://supabase.com/docs)
- **Pinecone Docs**: [docs.pinecone.io](https://docs.pinecone.io)

## Next Steps

1. ✅ Set up monitoring and alerts
2. ✅ Test the chat widget on shorelinedental.com
3. ✅ Upload initial knowledge base documents
4. ✅ Verify daily summary emails
5. ✅ Customize widget styling and branding
6. ✅ Set up analytics tracking (optional)

---

**Deployment completed!** Your chatbot is now live and will send daily summaries at 5:30 AM.
