# Quick Start: Deploy Shoreline Dental Chatbot (2-3 Hours)

## ✅ What You're Deploying:

- **Chat widget** → Embedded on shorelinedentalchicago.com
- **Backend API** → Hosted on Vercel (FREE)
- **Daily emails** → 5:59 AM CST to Anel & Mollie
- **Chat logs** → Stored in Supabase database

**Total Cost: $5-15/month** (only OpenRouter for AI)

---

## Step 1: Upload Knowledge Base (20 minutes)

### 1.1 Create .env File

```bash
cp .env.example .env
```

### 1.2 Edit .env with Your API Keys

Open `.env` and add:

```env
# Supabase (get from: https://supabase.com/dashboard/project/_/settings/api)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_supabase_anon_key_here

# Pinecone (get from: https://app.pinecone.io/)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=shoreline
PINECONE_HOST=https://shoreline-uabkyjr.svc.aped-4627-b74a.pinecone.io

# OpenRouter (get from: https://openrouter.ai/keys)
OPENROUTER_API_KEY=your_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
EMBEDDING_DIMENSIONS=512

# Resend (get from: https://resend.com/api-keys)
RESEND_API_KEY=your_resend_api_key
MANAGER_EMAIL=anel@shorelinedentalchicago.com,mollierojas@shorelinedentalchicago.com
FROM_EMAIL=chatbot@yourdomain.com

# Timezone & Schedule
TIMEZONE=America/Chicago
SUMMARY_TIME=05:59

# Cron Secret (generate random string)
CRON_SECRET=generate_random_secret_here_abc123xyz
```

**Where to get API keys:**
- **Supabase**: https://supabase.com/dashboard → Your Project → Settings → API
- **Pinecone**: https://app.pinecone.io/ → API Keys
- **OpenRouter**: https://openrouter.ai/keys
- **Resend**: https://resend.com/api-keys

### 1.3 Upload Knowledge Base to Pinecone

```bash
# This uploads 376 optimized chunks to Pinecone
npm run upload:docling
```

**Expected output:**
```
✓ Loaded 376 chunks
✓ Generating embeddings...
✓ Uploading to Pinecone...
✅ Successfully uploaded 376 vectors to Pinecone

Cost: ~$0.004 (one-time)
Time: 15-20 minutes
```

**⚠️ Important:** Wait for this to complete before proceeding!

---

## Step 2: Deploy to Vercel (30 minutes)

### 2.1 Install Vercel CLI

```bash
npm install -g vercel
```

### 2.2 Login to Vercel

```bash
vercel login
```

**Follow prompts:**
- Opens browser
- Sign in with GitHub/GitLab/Bitbucket/Email
- Confirm login in terminal

### 2.3 Deploy to Production

```bash
vercel --prod
```

**Answer prompts:**
- Set up and deploy? **Yes**
- Which scope? **Your account**
- Link to existing project? **No**
- Project name? **shoreline-dental-chatbot** (or your choice)
- Directory? **./** (press Enter)
- Build command? **npm run build** (press Enter)
- Output directory? **dist** (press Enter)

**Wait for deployment...**

**Result:** You'll get a URL like:
```
✅ Production: https://shoreline-dental-chatbot.vercel.app
```

**🔖 SAVE THIS URL!** You'll need it later.

---

## Step 3: Configure Vercel Environment Variables (15 minutes)

### 3.1 Go to Vercel Dashboard

Open: https://vercel.com/dashboard

Select your project: **shoreline-dental-chatbot**

### 3.2 Navigate to Settings → Environment Variables

Click: **Settings** (top menu) → **Environment Variables** (left sidebar)

### 3.3 Add ALL Variables from .env

**Click "Add New" for each:**

| Key | Value | Environment |
|-----|-------|-------------|
| `NODE_ENV` | `production` | Production |
| `SUPABASE_URL` | Your Supabase URL | Production |
| `SUPABASE_KEY` | Your Supabase anon key | Production |
| `PINECONE_API_KEY` | Your Pinecone API key | Production |
| `PINECONE_INDEX_NAME` | `shoreline` | Production |
| `PINECONE_ENVIRONMENT` | `us-east-1-aws` | Production |
| `PINECONE_HOST` | `https://shoreline-uabkyjr.svc.aped-4627-b74a.pinecone.io` | Production |
| `OPENROUTER_API_KEY` | Your OpenRouter key | Production |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | Production |
| `OPENROUTER_EMBEDDING_MODEL` | `openai/text-embedding-3-small` | Production |
| `EMBEDDING_DIMENSIONS` | `512` | Production |
| `RESEND_API_KEY` | Your Resend key | Production |
| `MANAGER_EMAIL` | `anel@shorelinedentalchicago.com,mollierojas@shorelinedentalchicago.com` | Production |
| `FROM_EMAIL` | `chatbot@yourdomain.com` | Production |
| `TIMEZONE` | `America/Chicago` | Production |
| `SUMMARY_TIME` | `05:59` | Production |
| `CRON_SECRET` | Your random secret | Production |

**💡 Tip:** Copy-paste from your `.env` file to avoid typos!

### 3.4 Redeploy (to pick up new env vars)

```bash
vercel --prod
```

---

## Step 4: Set Up Supabase Database (20 minutes)

### 4.1 Go to Supabase SQL Editor

Open: https://supabase.com/dashboard/project/_/sql

### 4.2 Create New Query

Click: **+ New query**

### 4.3 Paste This SQL and Run:

```sql
-- Create conversations table
CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT UNIQUE NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  end_time TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create messages table
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_conversations_session_id ON conversations(session_id);
CREATE INDEX idx_conversations_start_time ON conversations(start_time);
CREATE INDEX idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX idx_messages_timestamp ON messages(timestamp);

-- Enable Row Level Security
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow service role full access
CREATE POLICY "Allow service role full access to conversations"
  ON conversations FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Allow service role full access to messages"
  ON messages FOR ALL
  USING (auth.role() = 'service_role');
```

**Click: RUN** (or press Cmd/Ctrl+Enter)

**Expected:** ✅ Success message

---

## Step 5: Configure Cron Job for Daily Emails (5 minutes)

### 5.1 Verify vercel.json

Check that `vercel.json` exists with this content:

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-summary",
      "schedule": "59 10 * * *"
    }
  ]
}
```

**⚠️ Note on Timezone:**
- Vercel cron uses UTC time
- 5:59 AM CST (winter) = 11:59 AM UTC
- 5:59 AM CDT (summer) = 10:59 AM UTC
- The schedule `59 10 * * *` runs at 10:59 AM UTC = 5:59 AM CDT (summer)
- For winter (CST), change to `59 11 * * *`

### 5.2 Cron is Automatically Enabled!

Vercel reads `vercel.json` automatically. No extra configuration needed!

**Check in Vercel Dashboard:**
- Go to: Settings → Cron Jobs
- You should see: `/api/cron/daily-summary` scheduled

---

## Step 6: Update Widget with Production URL (10 minutes)

### 6.1 Edit embed-shoreline.js

Open: `public/embed-shoreline.js`

**Find line 21 and update:**

```javascript
// BEFORE:
apiBaseUrl: 'https://your-production-domain.com/api/chat',

// AFTER (use YOUR Vercel URL):
apiBaseUrl: 'https://shoreline-dental-chatbot.vercel.app/api/chat',
```

### 6.2 Deploy Update

```bash
git add public/embed-shoreline.js
git commit -m "Update production API URL"
vercel --prod
```

---

## Step 7: Add Widget to Your Website (5 minutes)

### 7.1 Get Your Embed Code

Your embed code is:

```html
<script src="https://shoreline-dental-chatbot.vercel.app/embed-shoreline.js"></script>
```

Replace `shoreline-dental-chatbot.vercel.app` with YOUR actual Vercel domain.

### 7.2 Add to shorelinedentalchicago.com

**Option A: WordPress**
1. Go to: Appearance → Theme Editor
2. Open: `footer.php`
3. Find: `</body>`
4. Add BEFORE `</body>`:
   ```html
   <!-- Shoreline Dental AI Chatbot -->
   <script src="https://shoreline-dental-chatbot.vercel.app/embed-shoreline.js"></script>
   ```
5. Click: **Update File**

**Option B: Squarespace**
1. Go to: Settings → Advanced → Code Injection
2. Paste in **Footer** section:
   ```html
   <script src="https://shoreline-dental-chatbot.vercel.app/embed-shoreline.js"></script>
   ```
3. Click: **Save**

**Option C: Wix**
1. Go to: Settings → Custom Code
2. Click: **+ Add Custom Code**
3. Paste code, set "Body - end", apply to "All pages"
4. Click: **Apply**

**Option D: HTML/Custom**
Add before closing `</body>` tag in your template.

---

## Step 8: Test Everything (15 minutes)

### 8.1 Test Chat Widget

1. **Visit:** https://www.shorelinedentalchicago.com
2. **Look for:** Blue chat button (bottom-right)
3. **Click:** Open chat
4. **Send:** "What are your hours?"
5. **Verify:** You get a response with business hours

**Troubleshooting:**
- Widget not appearing? Check browser console (F12) for errors
- "Connection error"? Verify Vercel deployment is live
- No response? Check Pinecone has 376 vectors

### 8.2 Check Supabase Database

1. **Go to:** https://supabase.com/dashboard
2. **Navigate to:** Table Editor → conversations
3. **Verify:** Your test conversation is saved
4. **Check:** messages table has your messages

### 8.3 Test Daily Email (Manual Trigger)

```bash
curl -X GET "https://shoreline-dental-chatbot.vercel.app/api/cron/daily-summary" \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Replace `YOUR_CRON_SECRET` with value from `.env`

**Expected:** Email arrives within 1-2 minutes to both Anel and Mollie

**Check email for:**
- ✅ Subject: "📊 Daily Chat Summary - [date] - Shoreline Dental"
- ✅ Either: Full summary with chat history
- ✅ Or: "No chats overnight" message (if no recent chats)

### 8.4 Test on Mobile

1. Open shorelinedentalchicago.com on phone
2. Verify chat button appears
3. Test sending a message
4. Check responsiveness

---

## ✅ You're Live!

### What You've Accomplished:

✅ **Chat widget** live on shorelinedentalchicago.com
✅ **AI chatbot** answering questions 24/7
✅ **376 optimized chunks** in Pinecone knowledge base
✅ **Daily emails** at 5:59 AM CST to Anel & Mollie
✅ **Chat history** saving to Supabase
✅ **$5-15/month** total cost

### Tomorrow Morning (5:59 AM):

Both Anel and Mollie will receive:
- ✉️ Daily email summary
- 📊 AI-generated analysis
- 📋 To-do items for today
- 💬 Complete chat transcripts

---

## Monitoring & Maintenance

### Daily:
- Check morning email summary

### Weekly:
- Review chat conversations in Supabase
- Monitor API usage in OpenRouter dashboard

### Monthly:
- Check costs in:
  - OpenRouter: https://openrouter.ai/activity
  - Pinecone: https://app.pinecone.io/
  - Resend: https://resend.com/emails

### As Needed:
- Update knowledge base if website content changes:
  ```bash
  npm run upload:docling
  ```

---

## Support & Resources

### Documentation:
- [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) - Full deployment guide
- [EMBED_INSTRUCTIONS.md](EMBED_INSTRUCTIONS.md) - Widget integration
- [EMAIL_SUMMARY_ENHANCEMENTS.md](EMAIL_SUMMARY_ENHANCEMENTS.md) - Email features

### Dashboards:
- **Vercel**: https://vercel.com/dashboard
- **Supabase**: https://supabase.com/dashboard
- **Pinecone**: https://app.pinecone.io/
- **OpenRouter**: https://openrouter.ai/
- **Resend**: https://resend.com/

### Troubleshooting:
See [DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md#part-8-troubleshooting)

---

## Cost Breakdown (Monthly)

| Service | Usage | Cost |
|---------|-------|------|
| **Vercel** | Free tier (100 GB-hours) | **$0** |
| **Pinecone** | Free tier (100k queries) | **$0** |
| **Supabase** | Free tier (500 MB) | **$0** |
| **Resend** | Free tier (3,000 emails) | **$0** |
| **OpenRouter** | Chat + embeddings | **$5-15** |
| **TOTAL** | - | **$5-15/month** |

**Breakdown of OpenRouter costs:**
- Chat messages: ~$0.15 per 1M input tokens
- Responses: ~$0.60 per 1M output tokens
- Embeddings: Already paid ($0.004 one-time)
- **Estimated:** 50-200 conversations/month = $5-15

---

## Next Steps After Launch

### Week 1:
- Monitor chat conversations
- Review email summaries
- Gather staff feedback
- Fine-tune responses if needed

### Month 1:
- Review analytics in Supabase
- Check cost in OpenRouter
- Update knowledge base if needed
- Train staff on using chat data

### Ongoing:
- Keep knowledge base updated
- Monitor for common questions
- Optimize responses based on feedback
- Consider adding features (see RAG_OPTIMIZATION_SUMMARY.md)

---

**🎉 Congratulations! Your AI chatbot is live!**

**Questions?** Check the documentation or Vercel logs for errors.

**Last Updated:** 2025-01-11
**Estimated Setup Time:** 2-3 hours
**Estimated Monthly Cost:** $5-15
