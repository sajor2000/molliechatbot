# Complete Setup Guide - Mollieweb AI Chatbot

This guide will walk you through setting up your world-class AI chatbot from scratch.

---

## 📋 Overview

**Tech Stack:**
- **Supabase**: PostgreSQL database + file storage
- **Pinecone**: Vector embeddings for RAG (Retrieval-Augmented Generation)
- **OpenRouter**: AI chat (Claude 3.5 Sonnet) + embeddings (OpenAI)
- **Vercel**: Serverless deployment + cron jobs
- **Resend**: Email automation for daily summaries
- **cron-job.org**: External scheduler for daily email triggers

**What You'll Build:**
- AI chatbot that answers questions using your knowledge base
- Embeddable chat widget for any website
- Automated daily email summaries at 5:30 AM
- Document processing pipeline with intelligent chunking

---

## ⏱️ Estimated Time: 45 minutes

---

## 📦 Prerequisites

- Node.js 18+ installed
- npm or yarn
- Git
- Accounts (all have free tiers):
  - [Supabase](https://supabase.com)
  - [Pinecone](https://www.pinecone.io)
  - [OpenRouter](https://openrouter.ai)
  - [Vercel](https://vercel.com)
  - [Resend](https://resend.com)
  - [cron-job.org](https://cron-job.org)

---

## 🚀 Step-by-Step Setup

### 1. Clone and Install Dependencies

```bash
# Navigate to your project folder
cd /Users/JCR/Downloads/mollieweb

# Install dependencies
npm install

# Verify installation
npm list --depth=0
```

**Expected packages:**
- `@pinecone-database/pinecone`
- `@supabase/supabase-js`
- `@vercel/node`
- `express`, `cors`, `dotenv`
- `resend`, `axios`, `uuid`
- `formidable`, `pdf-parse`

---

### 2. Set Up Supabase

#### A. Create Project

1. Go to [app.supabase.com](https://app.supabase.com)
2. Click **"New Project"**
3. Choose a name: `mollieweb-chatbot`
4. Set a database password (save this!)
5. Choose region: **US East (Ohio)** or closest to you
6. Click **"Create new project"** (takes ~2 minutes)

#### B. Get API Credentials

1. In your project dashboard, go to **Settings → API**
2. Copy these values:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long string)

#### C. Create Database Table

1. Go to **SQL Editor** in left sidebar
2. Click **"New Query"**
3. Open the file `supabase-setup.sql` in your project
4. Copy the entire contents
5. Paste into SQL Editor
6. Click **"Run"** button
7. You should see: ✅ "Supabase setup complete! conversations table created with indexes"

#### D. Verify Table Creation

Run this query in SQL Editor:

```sql
SELECT * FROM conversations LIMIT 1;
```

Should return empty result (no error).

#### E. Create Storage Bucket (Optional)

1. Go to **Storage** in left sidebar
2. Click **"New Bucket"**
3. Name: `documents`
4. Public: ✅ Yes
5. File size limit: `10485760` (10MB)
6. Allowed MIME types: `application/pdf, text/plain, text/markdown`
7. Click **"Create bucket"**

---

### 3. Set Up Pinecone

#### A. Create Account & Project

1. Go to [app.pinecone.io](https://app.pinecone.io)
2. Sign up (free tier includes 100K vectors)
3. Verify email

#### B. Create Index

1. Click **"Create Index"**
2. **Index Name**: `mollieweb-chatbot`
3. **Dimensions**: `512` (must match embedding model)
   - If using `text-embedding-3-small` with 512 dimensions
   - If using default 1536 dimensions, set to `1536`
4. **Metric**: `cosine`
5. **Cloud**: `AWS`
6. **Region**: `us-east-1` (free tier)
7. Click **"Create Index"** (takes ~1 minute)

#### C. Get API Credentials

1. Click on your index name
2. Go to **"Connect"** tab
3. Copy:
   - **API Key**: `xxxx-xxxx-xxxx-xxxx`
   - **Host**: `mollieweb-chatbot-xxxxx.svc.aped-4627-b74a.pinecone.io`

---

### 4. Set Up OpenRouter

#### A. Create Account

1. Go to [openrouter.ai](https://openrouter.ai)
2. Click **"Sign In"** → Sign in with Google/GitHub
3. Verify email if required

#### B. Get API Key

1. Go to **"Keys"** in top menu
2. Click **"Create Key"**
3. Name: `Mollieweb Chatbot`
4. Copy the key: `sk-or-v1-xxxxx`

#### C. Add Credits (Optional)

OpenRouter uses pay-as-you-go pricing. Add $5-10 credits:
1. Go to **"Credits"**
2. Click **"Add Credits"**
3. Choose amount and pay

**Cost estimates (with Claude 3.5 Sonnet + OpenAI embeddings):**
- Chat: ~$0.003 per message (1000 tokens)
- Embeddings: ~$0.0001 per document chunk
- $5 = ~1,500 chat messages + embedding 50K chunks

---

### 5. Set Up Resend

#### A. Create Account

1. Go to [resend.com](https://resend.com)
2. Sign up (free tier: 3,000 emails/month)
3. Verify email

#### B. Get API Key

1. Go to **"API Keys"** in dashboard
2. Click **"Create API Key"**
3. Name: `Mollieweb Daily Summaries`
4. Permission: **"Sending access"**
5. Copy key: `re_xxxxx`

#### C. Verify Domain (Optional, Recommended)

For production, verify your domain:
1. Go to **"Domains"**
2. Click **"Add Domain"**
3. Enter: `yourdomain.com`
4. Add DNS records provided by Resend
5. Wait for verification (up to 48 hours)

**For testing:** Use `onboarding@resend.dev` as FROM email (works without verification)

---

### 6. Configure Environment Variables

Create a `.env` file in your project root:

```bash
# Copy the example
cp .env.example .env

# Open in your editor
nano .env  # or use VS Code, etc.
```

Fill in your credentials:

```bash
# Supabase Configuration
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Pinecone Configuration
PINECONE_API_KEY=xxxx-xxxx-xxxx-xxxx
PINECONE_INDEX_NAME=mollieweb-chatbot
PINECONE_HOST=mollieweb-chatbot-xxxxx.svc.aped-4627-b74a.pinecone.io

# OpenRouter Configuration
OPENROUTER_API_KEY=sk-or-v1-xxxxx
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
EMBEDDING_DIMENSIONS=512

# Resend Email Configuration
RESEND_API_KEY=re_xxxxx
MANAGER_EMAIL=your.email@example.com
FROM_EMAIL=chatbot@yourdomain.com
# For testing, use: FROM_EMAIL=onboarding@resend.dev

# Scheduler Configuration
TIMEZONE=America/Chicago
SUMMARY_TIME=05:30

# Cron Secret (generate random string)
CRON_SECRET=your_random_secure_secret_here_change_this_123
```

**Generate a secure CRON_SECRET:**

```bash
# On macOS/Linux:
openssl rand -base64 32

# Or use any random string generator
```

Save the file.

---

### 7. Prepare Knowledge Base

#### A. Create Knowledge Base Folder

```bash
mkdir -p knowledge-base
```

#### B. Add Documents

Place your documents in the `knowledge-base/` folder:

```
knowledge-base/
├── services.pdf
├── pricing.txt
├── policies.md
├── faq.pdf
└── about-us.txt
```

**Supported formats:**
- `.pdf` - PDF documents
- `.txt` - Plain text files
- `.md` - Markdown files

**Best practices:**
- Use descriptive filenames (e.g., `dental-services.pdf` not `doc1.pdf`)
- Keep files under 10MB each
- Use clear, well-structured content
- Include headings and sections

#### C. Process and Upload to Pinecone

```bash
npm run upload:knowledge
```

**Expected output:**

```
📄 Reading files from knowledge-base directory...
✅ Found 5 files to process

📖 Processing: services.pdf
✂️  Created 23 chunks (avg size: 850 chars)

📖 Processing: pricing.txt
✂️  Created 8 chunks (avg size: 780 chars)

... (continues for all files)

🔢 Generating embeddings for 67 chunks...
⏳ Processing batch 1/1 (67 chunks)...
✅ Embeddings generated successfully

📤 Uploading vectors to Pinecone...
⏳ Uploading batch 1/1 (67 vectors)...
✅ Upload complete!

🎉 Success! Uploaded 67 vectors to Pinecone
```

**Troubleshooting:**

- **Error: "Dimension mismatch"**: Check `EMBEDDING_DIMENSIONS` in `.env` matches Pinecone index
- **Error: "API key invalid"**: Verify OpenRouter and Pinecone API keys
- **No files found**: Check folder is named `knowledge-base` (singular)

---

### 8. Test Locally

#### A. Start Development Server

```bash
npm run dev
```

**Expected output:**

```
Server running on http://localhost:3000
Supabase initialized: https://xxxxx.supabase.co
Pinecone initialized: mollieweb-chatbot
```

#### B. Test Chat Endpoint

Open another terminal and test:

```bash
curl -X POST http://localhost:3000/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your office hours?",
    "sessionId": "test-session-123",
    "metadata": {}
  }'
```

**Expected response:**

```json
{
  "reply": "Our office is open Monday through Friday from 8:00 AM to 5:00 PM...",
  "sessionId": "test-session-123"
}
```

#### C. Test Summary Endpoint

```bash
curl -X POST http://localhost:3000/api/cron/trigger-summary \
  -H "Content-Type: application/json"
```

Should return conversation summary (or "No conversations found").

#### D. Verify Database

In Supabase SQL Editor:

```sql
SELECT id, start_time, end_time, array_length(messages, 1) as message_count
FROM conversations
ORDER BY start_time DESC
LIMIT 5;
```

Should show test conversations.

---

### 9. Deploy to Vercel

#### A. Install Vercel CLI

```bash
npm install -g vercel
```

#### B. Login to Vercel

```bash
vercel login
```

Follow the prompts to authenticate.

#### C. Deploy

```bash
# First deployment (follow prompts)
vercel

# When prompted:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name? mollieweb-chatbot
# - Directory? ./ (press Enter)
# - Override settings? No

# Wait for deployment...
# You'll get a preview URL: https://mollieweb-chatbot-xxxxx.vercel.app
```

#### D. Add Environment Variables

In Vercel dashboard:

1. Go to your project: [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click on `mollieweb-chatbot`
3. Go to **Settings → Environment Variables**
4. Add each variable from your `.env` file:

```
SUPABASE_URL → https://xxxxx.supabase.co
SUPABASE_KEY → eyJhbGc...
PINECONE_API_KEY → xxxx-xxxx
PINECONE_INDEX_NAME → mollieweb-chatbot
PINECONE_HOST → mollieweb-chatbot-xxxxx.svc...
OPENROUTER_API_KEY → sk-or-v1-xxxxx
OPENROUTER_MODEL → anthropic/claude-3.5-sonnet
OPENROUTER_EMBEDDING_MODEL → openai/text-embedding-3-small
EMBEDDING_DIMENSIONS → 512
RESEND_API_KEY → re_xxxxx
MANAGER_EMAIL → your.email@example.com
FROM_EMAIL → chatbot@yourdomain.com
TIMEZONE → America/Chicago
SUMMARY_TIME → 05:30
CRON_SECRET → your_random_secure_secret_here
```

**Important:** Select environment: **Production**, **Preview**, and **Development** for each variable.

#### E. Deploy to Production

```bash
vercel --prod
```

Copy your production URL: `https://mollieweb-chatbot.vercel.app`

---

### 10. Set Up Daily Email Automation

#### A. Create cron-job.org Account

1. Go to [cron-job.org](https://cron-job.org/en/)
2. Click **"Sign up"** (free account)
3. Verify email

#### B. Create Cron Job

1. Click **"Cronjobs"** in dashboard
2. Click **"Create cronjob"**
3. Fill in:

**Title:** `Mollieweb Daily Summary`

**URL:** `https://mollieweb-chatbot.vercel.app/api/cron/daily-summary`

**Schedule:**
- **Type**: `Every day`
- **Hour**: `05` (5 AM)
- **Minute**: `30`
- **Timezone**: `America/Chicago` (or your timezone)

**Request Method:** `GET`

**Request Headers:**
```
Authorization: Bearer your_random_secure_secret_here
```
(Use the same value as `CRON_SECRET` from `.env`)

**Advanced Settings:**
- **Save responses**: ✅ Yes (for debugging)
- **Notify on failure**: ✅ Yes

4. Click **"Create cronjob"**

#### C. Test Cron Job

Click **"Run now"** button on your cronjob.

Check the execution log:
- **Status**: Should be `200 OK`
- **Response**: Should show JSON with `{ success: true, ... }`

#### D. Verify Email

Check your `MANAGER_EMAIL` inbox for the daily summary email.

**Email should contain:**
- Date of summary
- Total conversations count
- Total messages count
- AI-generated summary
- Action items list
- Individual conversation details

---

### 11. Embed Chat Widget on Website

Follow the [EMBEDDING_GUIDE.md](./EMBEDDING_GUIDE.md) for detailed instructions.

**Quick Test (HTML):**

Create `test.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Chat Widget Test</title>
</head>
<body>
  <h1>Test Page</h1>
  <p>The chat widget should appear in the bottom-right corner.</p>

  <!-- Chat Widget -->
  <div id="shoreline-chat-widget"></div>
  <script>
    (function() {
      const config = {
        apiUrl: 'https://mollieweb-chatbot.vercel.app/api/chat/webhook',
        position: 'bottom-right',
        primaryColor: '#0066cc',
        greeting: 'Hi! How can we help you today?',
        title: 'Chat with Shoreline Dental'
      };
      // ... (copy full widget code from EMBEDDING_GUIDE.md)
    })();
  </script>
</body>
</html>
```

Open in browser and test chat functionality.

---

## ✅ Verification Checklist

Before going live, verify:

### Database
- [ ] Conversations table exists in Supabase
- [ ] Test conversation saved successfully
- [ ] Indexes created (check SQL Editor)

### Vector Database
- [ ] Pinecone index created with correct dimensions
- [ ] Knowledge base documents uploaded
- [ ] Vector count matches expected (check Pinecone dashboard)

### API Endpoints
- [ ] `/api/chat/webhook` returns chat responses
- [ ] `/api/chat/end-session` saves conversations
- [ ] `/api/cron/daily-summary` sends email
- [ ] All endpoints return proper JSON

### Deployment
- [ ] Vercel deployment successful
- [ ] All environment variables set in Vercel
- [ ] Production URL accessible
- [ ] No errors in Vercel function logs

### Automation
- [ ] Cron job created and scheduled
- [ ] Test execution successful (200 OK)
- [ ] Email received at manager address
- [ ] Email contains expected data

### Chat Widget
- [ ] Widget appears on test page
- [ ] Messages send and receive responses
- [ ] Styling correct (colors, position)
- [ ] Mobile responsive
- [ ] No console errors

---

## 🔧 Configuration

### Adjust Embedding Dimensions

If you want to use different embedding dimensions:

1. **Update Pinecone index**: Must recreate with new dimension
2. **Update `.env`**:
   ```bash
   EMBEDDING_DIMENSIONS=1536  # for full OpenAI embeddings
   # or
   EMBEDDING_DIMENSIONS=512   # for reduced size (faster, cheaper)
   ```
3. **Re-upload knowledge base**: `npm run upload:knowledge`

### Change AI Model

In `.env`:

```bash
# Use GPT-4
OPENROUTER_MODEL=openai/gpt-4-turbo

# Use different Claude version
OPENROUTER_MODEL=anthropic/claude-3-opus

# Use open-source model
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct
```

See [OpenRouter models](https://openrouter.ai/models) for full list.

### Adjust Email Schedule

In cron-job.org:
1. Edit your cronjob
2. Change **Schedule** to desired time
3. Update **Timezone** if needed
4. Save

### Modify System Prompt

Edit [src/config/system-prompt.ts](src/config/system-prompt.ts):

```typescript
export const SYSTEM_PROMPT = `
# Your custom system prompt here
You are a helpful assistant for...
`;
```

Redeploy:

```bash
vercel --prod
```

---

## 📊 Monitoring & Maintenance

### View Conversations

**Supabase SQL Editor:**

```sql
-- Recent conversations
SELECT id, start_time, array_length(messages, 1) as msg_count
FROM conversations
WHERE start_time > NOW() - INTERVAL '7 days'
ORDER BY start_time DESC;

-- Active conversations (not ended)
SELECT * FROM conversations WHERE end_time IS NULL;

-- Conversations by date
SELECT DATE(start_time) as date, COUNT(*) as count
FROM conversations
GROUP BY DATE(start_time)
ORDER BY date DESC;
```

### Monitor Vector Usage

**Pinecone Dashboard:**

1. Go to [app.pinecone.io](https://app.pinecone.io)
2. Click on your index
3. View metrics:
   - Total vectors
   - Storage used
   - Query count

**Free tier limits:**
- 100,000 vectors
- 1 index
- 10 queries/second

### Check Vercel Logs

1. Go to [vercel.com/dashboard](https://vercel.com/dashboard)
2. Click your project
3. Go to **"Logs"** tab
4. Filter by function: `api/chat/webhook`, `api/cron/daily-summary`

**Common issues:**
- Function timeout: Increase in `vercel.json` (max 60s on Pro plan)
- Memory limit: Reduce batch sizes in embedding script
- Rate limiting: Implement exponential backoff (already included)

### Email Delivery Issues

**Resend Dashboard:**

1. Go to [resend.com/emails](https://resend.com/emails)
2. View all sent emails
3. Check delivery status
4. View bounce/complaint reports

**Troubleshooting:**
- Verify domain DNS records
- Check FROM_EMAIL matches verified domain
- Ensure MANAGER_EMAIL is valid
- Check spam folder

---

## 🛠️ Troubleshooting

### "Cannot find module" errors

```bash
# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

### "Invalid API key" errors

1. Verify keys in `.env` are correct
2. Check no extra spaces or quotes
3. Ensure keys match service dashboards
4. Verify environment variables set in Vercel

### Pinecone "Dimension mismatch"

1. Check `EMBEDDING_DIMENSIONS` in `.env`
2. Verify Pinecone index dimension
3. If mismatch, delete and recreate Pinecone index
4. Re-run `npm run upload:knowledge`

### Chat widget not appearing

1. Open browser DevTools → Console
2. Check for JavaScript errors
3. Verify API URL is correct
4. Test API endpoint directly with curl
5. Check CORS settings (Vercel allows all by default)

### Daily email not sending

1. Check cron-job.org execution log
2. Verify Authorization header matches CRON_SECRET
3. Test endpoint manually:
   ```bash
   curl -X GET https://your-app.vercel.app/api/cron/daily-summary \
     -H "Authorization: Bearer your_cron_secret_here"
   ```
4. Check Resend API key is valid
5. Verify FROM_EMAIL domain is verified (or use onboarding@resend.dev)

### Vercel deployment failures

1. Check build logs in Vercel dashboard
2. Verify TypeScript compiles: `npm run build`
3. Ensure all dependencies in `package.json`
4. Check Node.js version (18+ required)

---

## 💰 Cost Estimates (Monthly)

### Free Tier Limits

| Service | Free Tier | Estimated Usage | Cost |
|---------|-----------|-----------------|------|
| **Supabase** | 500MB DB, 1GB storage | ~10MB for 1000 convos | $0 |
| **Pinecone** | 100K vectors | ~5K vectors (50 docs) | $0 |
| **OpenRouter** | Pay-as-you-go | 500 chats/month | ~$1.50 |
| **Vercel** | 100GB bandwidth | ~10GB | $0 |
| **Resend** | 3,000 emails/month | 30 emails/month | $0 |
| **cron-job.org** | Unlimited | 1 job | $0 |

**Total monthly cost: ~$1.50**

### Scaling Costs

At **1,000 conversations/month**:

| Service | Usage | Cost |
|---------|-------|------|
| Supabase | Within free tier | $0 |
| Pinecone | Within free tier | $0 |
| OpenRouter | 1,000 chats × $0.003 | $3.00 |
| Vercel | Within free tier | $0 |
| Resend | Within free tier | $0 |

**Total: ~$3/month**

At **10,000 conversations/month**:

| Service | Usage | Cost |
|---------|-------|------|
| Supabase | Pro plan | $25 |
| Pinecone | 50K vectors (free) | $0 |
| OpenRouter | 10K chats × $0.003 | $30 |
| Vercel | Within free tier | $0 |
| Resend | Within free tier | $0 |

**Total: ~$55/month**

---

## 🚀 Next Steps

### Add More Features

1. **User authentication**: Require login for chat
2. **Chat history**: Show past conversations per user
3. **File upload**: Let users upload documents in chat
4. **Multi-language support**: Detect and respond in user's language
5. **Analytics**: Track popular questions, satisfaction scores
6. **Live handoff**: Transfer to human agent
7. **Voice input**: Add speech-to-text

### Improve Performance

1. **Caching**: Cache frequent queries
2. **CDN**: Use Vercel Edge for faster global responses
3. **Lazy loading**: Load widget only when needed
4. **Compression**: Reduce payload sizes

### Enhance Security

1. **Rate limiting**: Implement per-IP limits
2. **CAPTCHA**: Prevent bot spam
3. **Content filtering**: Block inappropriate messages
4. **Audit logs**: Track all API access

---

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Pinecone Documentation](https://docs.pinecone.io)
- [OpenRouter Documentation](https://openrouter.ai/docs)
- [Vercel Documentation](https://vercel.com/docs)
- [Resend Documentation](https://resend.com/docs)
- [EMBEDDING_GUIDE.md](./EMBEDDING_GUIDE.md) - Widget integration guide

---

## 🎉 Congratulations!

You now have a fully functional, production-ready AI chatbot with:

✅ RAG-powered knowledge base
✅ Embeddable chat widget
✅ Automated daily email summaries
✅ Scalable serverless architecture
✅ World-class AI (Claude 3.5 Sonnet)
✅ Cost-effective free tier usage

**Your chatbot is ready to serve your customers 24/7!** 🚀

---

## 🆘 Need Help?

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review Vercel function logs
3. Test each component individually (database, vectors, API, email)
4. Verify all environment variables are set correctly

**Common gotchas:**
- API keys with extra spaces
- Wrong Pinecone dimensions
- Unverified email domain in Resend
- Missing Authorization header in cron job
- CORS issues (check API allows your domain)

---

**Last Updated:** 2025-11-10
**Version:** 1.0.0
