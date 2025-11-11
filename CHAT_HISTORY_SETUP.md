# Chat History & Daily Summary Setup Guide

**Status:** ✅ **FULLY IMPLEMENTED AND READY TO USE**

Your chat history system is already complete and production-ready. This guide will help you activate and test it.

---

## 🎯 What You Have

### **1. Automatic Conversation Storage**
- **Temporary:** Vercel KV (Redis) stores active sessions with 1-hour TTL
- **Permanent:** Supabase PostgreSQL archives all completed conversations
- **Auto-save:** When user closes chat or session expires

### **2. Daily Email Summaries**
- **Schedule:** Every day at **5:59 AM Chicago time** (10:59 UTC)
- **Content:**
  - AI-generated executive summary
  - Actionable to-do items
  - Full conversation transcripts
  - Statistics (total chats, messages)
- **Recipients:** Multiple email addresses supported

### **3. Manual Summary Trigger**
- Test endpoint for on-demand summaries
- Great for testing before going live

---

## 📋 Setup Instructions (5 Minutes)

### Step 1: Configure Resend Email Service

1. **Sign up for Resend** (if not already)
   - Go to https://resend.com
   - Create free account (100 emails/day free)
   - Verify your domain or use test mode

2. **Get API Key**
   - Dashboard → API Keys → Create API Key
   - Copy the key (starts with `re_...`)

3. **Add to Vercel Environment Variables**
   ```bash
   # Go to: Vercel Dashboard → Your Project → Settings → Environment Variables

   RESEND_API_KEY=re_your_actual_key_here
   MANAGER_EMAIL=manager@yourdomain.com,admin@yourdomain.com
   RESEND_FROM_EMAIL=noreply@yourdomain.com
   ```

   **Notes:**
   - `MANAGER_EMAIL`: Comma-separated list of recipients
   - `RESEND_FROM_EMAIL`: Must be from verified domain (or use Resend test domain)
   - Add to: **Production**, **Preview**, and **Development** environments

---

### Step 2: Set Cron Security Token

**Generate secure token:**
```bash
openssl rand -base64 32
```

**Add to Vercel:**
```bash
CRON_SECRET=your_generated_token_here
```

This prevents unauthorized access to the cron endpoint.

---

### Step 3: Verify Supabase Table Exists

**Check your Supabase database has the `conversations` table:**

```sql
-- This should already exist from previous setup
-- If not, run this:

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  messages JSONB NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_conversations_start_time ON conversations(start_time DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at DESC);
```

---

### Step 4: Redeploy

After adding environment variables, trigger a redeploy:

```bash
# Option A: Push a commit (triggers auto-deploy)
git commit --allow-empty -m "chore: activate chat history features"
git push origin main

# Option B: Manual redeploy in Vercel Dashboard
# Go to Deployments → ... → Redeploy
```

---

## 🧪 Testing

### Test 1: Manual Summary Trigger

**Send test email immediately:**

```bash
# Replace with your actual domain
curl -X POST https://your-app.vercel.app/api/chat/trigger-summary
```

**Expected result:**
- Email sent to addresses in `MANAGER_EMAIL`
- Subject: "Daily Chat Summary - [Date]"
- Contains yesterday's conversations (or "no chats" message)

**Response:**
```json
{
  "success": true,
  "message": "Daily summary sent successfully",
  "stats": {
    "conversations": 5,
    "messages": 23,
    "todoItems": 3,
    "date": "2025-01-11"
  }
}
```

---

### Test 2: Verify Cron Schedule

**Check cron is configured:**

1. Go to **Vercel Dashboard → Your Project → Settings → Cron Jobs**
2. You should see:
   ```
   Path: /api/cron/daily-summary
   Schedule: 59 10 * * *
   Status: Active
   ```

3. **Schedule Translation:**
   - `59 10 * * *` = 10:59 UTC
   - Chicago time: 5:59 AM (CST) or 6:59 AM (CDT)

---

### Test 3: Create Test Conversation

1. **Open your chatbot** on your website or test page
2. **Send a few messages:**
   ```
   User: What are your hours?
   Bot: [Response]
   User: Do you accept insurance?
   Bot: [Response]
   ```

3. **Close the chat** (triggers end-session)

4. **Check Supabase:**
   ```sql
   SELECT * FROM conversations
   ORDER BY created_at DESC
   LIMIT 1;
   ```

5. **Verify conversation was saved** with all messages

---

### Test 4: Check Email Delivery

**After running manual trigger, check:**

1. **Email arrived** in inbox (check spam folder too)
2. **Subject line correct:** "Daily Chat Summary - [Date] | Shoreline Dental Chicago"
3. **Content includes:**
   - Overview statistics
   - AI summary
   - To-do items (if any)
   - Full transcripts with timestamps
4. **Links work** (if any)
5. **Formatting looks professional**

---

## 📧 Email Template Preview

### Subject Line
```
Daily Chat Summary - January 11, 2025 | Shoreline Dental Chicago
```

### Email Content Structure

```
┌─────────────────────────────────────────┐
│  🦷 SHORELINE DENTAL CHICAGO           │
│  Daily Chat Summary                     │
└─────────────────────────────────────────┘

📊 Overview
Yesterday (January 11, 2025)
• Total Conversations: 12
• Total Messages: 47

────────────────────────────────────────────

📝 Summary
[AI-generated executive summary of all conversations]

────────────────────────────────────────────

✅ Action Items
• [To-do item 1]
• [To-do item 2]
• [To-do item 3]

────────────────────────────────────────────

💬 All Conversations

Conversation 1 (10:23 AM)
───────────────────────
User: What are your hours?
Assistant: We're open Monday-Friday...

[Additional conversations...]

────────────────────────────────────────────

Need to adjust settings? Contact your IT team.
```

---

## 🔧 Configuration Options

### Adjust Email Schedule

**Edit `/Users/JCR/Downloads/mollieweb/vercel.json`:**

```json
{
  "crons": [
    {
      "path": "/api/cron/daily-summary",
      "schedule": "59 10 * * *"  // Change this
    }
  ]
}
```

**Cron Format:** `minute hour day month weekday`

**Common Schedules:**
- `0 6 * * *` = 6:00 AM UTC daily
- `0 12 * * *` = 12:00 PM UTC daily
- `0 0 * * 1` = Midnight UTC every Monday
- `0 9 1 * *` = 9:00 AM UTC on 1st of month

**After editing:** Commit and push to update cron schedule.

---

### Add More Recipients

**In Vercel environment variables:**

```bash
# Comma-separated, no spaces
MANAGER_EMAIL=manager@domain.com,admin@domain.com,owner@domain.com
```

---

### Customize Email Branding

**Edit `/Users/JCR/Downloads/mollieweb/src/services/email.service.ts`:**

**Change colors:**
```typescript
// Find the style section (around line 50)
background: linear-gradient(135deg, #2C5F8D 0%, #4A90A4 100%);
```

**Change business name:**
```typescript
// Find the header section (around line 60)
<h1>Shoreline Dental Chicago</h1>
// Change to your business name
```

**After editing:** Commit, push, and redeploy.

---

## 📊 Monitoring

### View Sent Emails

**Resend Dashboard:**
1. Go to https://resend.com/emails
2. See all sent emails
3. Check delivery status
4. View email content

### Check Cron Execution

**Vercel Dashboard:**
1. Go to **Deployments** tab
2. Filter by **Cron Jobs**
3. See execution history and logs

### View Stored Conversations

**Supabase Dashboard:**
```sql
-- Today's conversations
SELECT id, start_time,
       jsonb_array_length(messages) as message_count
FROM conversations
WHERE start_time >= CURRENT_DATE
ORDER BY start_time DESC;

-- Conversation count by date
SELECT DATE(start_time) as date,
       COUNT(*) as conversations,
       SUM(jsonb_array_length(messages)) as total_messages
FROM conversations
GROUP BY DATE(start_time)
ORDER BY date DESC;
```

---

## 🚨 Troubleshooting

### Email Not Received

**Check:**
1. Spam/junk folder
2. Resend dashboard for delivery errors
3. `RESEND_API_KEY` is correct
4. `RESEND_FROM_EMAIL` is verified in Resend
5. `MANAGER_EMAIL` addresses are correct

**Test email sending:**
```bash
curl -X POST https://your-app.vercel.app/api/chat/trigger-summary
```

---

### Cron Not Running

**Check:**
1. `CRON_SECRET` environment variable is set
2. Cron schedule in `vercel.json` is correct
3. Vercel plan supports cron (Hobby+ required)
4. Check deployment logs for errors

**Manual trigger to test:**
```bash
curl -X GET https://your-app.vercel.app/api/cron/daily-summary \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

---

### Conversations Not Saving

**Check:**
1. `SUPABASE_URL` and `SUPABASE_KEY` are set
2. Supabase `conversations` table exists
3. Check function logs in Vercel for errors
4. Verify end-session endpoint is being called

**Test end-session:**
```bash
curl -X POST https://your-app.vercel.app/api/chat/end-session \
  -H "Content-Type: application/json" \
  -d '{"sessionId": "test-session-123"}'
```

---

### No AI Summary Generated

**Check:**
1. `OPENROUTER_API_KEY` is set
2. OpenRouter account has credits
3. Check function logs for API errors

**Error messages to look for:**
- "Invalid API key"
- "Insufficient credits"
- "Rate limit exceeded"

---

## 💡 Tips

### Best Practices

1. **Test First:** Use manual trigger endpoint before waiting for cron
2. **Check Spam:** Add sender to safe list
3. **Monitor Costs:** Check Resend and OpenRouter usage
4. **Set Alerts:** Monitor Supabase storage usage
5. **Backup Data:** Export conversations regularly

---

### Data Retention

**Current setting:** 90 days

**To change:**
Edit `/Users/JCR/Downloads/mollieweb/src/services/supabase-database.service.ts`:

```typescript
async deleteOldConversations(daysToKeep: number = 90): Promise<number> {
  // Change 90 to your preferred retention period
}
```

**Run cleanup manually:**
```typescript
await supabaseDatabaseService.deleteOldConversations(30); // Keep 30 days
```

---

## 📈 Future Enhancements Available

Once you verify the basic system works, you can add:

### 1. Admin Dashboard
- View all conversations in web interface
- Search and filter by date
- Export to CSV

### 2. Real-Time Alerts
- Instant notifications for urgent keywords
- Slack integration
- SMS alerts

### 3. Analytics Dashboard
- Conversation trends over time
- Common questions analysis
- Response time metrics

### 4. Weekly/Monthly Reports
- Aggregate summaries
- Trend comparisons
- Top questions list

### 5. Conversation Tagging
- Auto-categorize conversations
- Filter by topics
- Tag-based reporting

**Contact your developer to implement any of these features.**

---

## 📞 Support

### Environment Variables Checklist

Required for chat history:
- [x] `SUPABASE_URL`
- [x] `SUPABASE_KEY`
- [x] `KV_REST_API_URL` (auto-set by Vercel)
- [x] `KV_REST_API_TOKEN` (auto-set by Vercel)

Required for email summaries:
- [ ] `RESEND_API_KEY`
- [ ] `MANAGER_EMAIL`
- [ ] `RESEND_FROM_EMAIL`
- [ ] `CRON_SECRET`

Required for AI summaries:
- [x] `OPENROUTER_API_KEY`
- [x] `OPENAI_API_KEY`

---

## 🎉 Summary

Your chat history system is **production-ready**. After configuring the 4 email-related environment variables:

1. ✅ Conversations automatically save to Supabase
2. ✅ Daily summaries email at 5:59 AM Chicago time
3. ✅ Manual trigger available for testing
4. ✅ Full conversation history accessible in database
5. ✅ AI-powered summary generation
6. ✅ Multiple recipient support
7. ✅ Professional branded emails

**No code changes needed. Just configure and test!**

---

**Last Updated:** January 11, 2025
**Version:** 1.0.0
**Status:** Production Ready
