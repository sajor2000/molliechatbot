# Chat History - Quick Start ⚡

## ✅ Status: ALREADY IMPLEMENTED

Your chat history system is **100% complete and working**. Just configure 4 environment variables to activate emails.

---

## 🚀 5-Minute Setup

### Step 1: Sign up for Resend
https://resend.com (100 free emails/day)

### Step 2: Add to Vercel
**Dashboard → Settings → Environment Variables**

```bash
RESEND_API_KEY=re_your_key_here
MANAGER_EMAIL=your@email.com,another@email.com
RESEND_FROM_EMAIL=noreply@yourdomain.com
CRON_SECRET=$(openssl rand -base64 32)
```

### Step 3: Test
```bash
curl -X POST https://your-app.vercel.app/api/chat/trigger-summary
```

**Done!** Check your email.

---

## 📊 What You Get

| Feature | Status | Details |
|---------|--------|---------|
| **Conversation Storage** | ✅ Active | Saved to Supabase permanently |
| **Daily Email Summary** | ✅ Active | 5:59 AM Chicago time |
| **AI Summary** | ✅ Active | Powered by OpenRouter |
| **Multiple Recipients** | ✅ Active | Comma-separated emails |
| **Full Transcripts** | ✅ Active | All messages included |
| **Action Items** | ✅ Active | AI-generated to-dos |

---

## 📧 Email Schedule

**Current:** Every day at **5:59 AM Chicago time**

**Change:** Edit `vercel.json` → `crons` section

**Common schedules:**
- `0 6 * * *` = 6 AM UTC daily
- `0 0 * * 1` = Monday midnight
- `0 9 1 * *` = 1st of month at 9 AM

---

## 🧪 Test Commands

### Manual email trigger:
```bash
curl -X POST https://your-domain.vercel.app/api/chat/trigger-summary
```

### Test cron endpoint:
```bash
curl -X GET https://your-domain.vercel.app/api/cron/daily-summary \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

### Check Supabase conversations:
```sql
SELECT * FROM conversations ORDER BY created_at DESC LIMIT 10;
```

---

## 🔍 View Data

### Resend Dashboard
https://resend.com/emails
- See all sent emails
- Check delivery status

### Supabase Dashboard
Query conversations table:
```sql
SELECT DATE(start_time) as date, COUNT(*) as chats
FROM conversations
GROUP BY DATE(start_time)
ORDER BY date DESC;
```

### Vercel Logs
Dashboard → Functions → `/api/cron/daily-summary`
- See execution history
- Check for errors

---

## 🚨 Troubleshooting

| Problem | Solution |
|---------|----------|
| No email received | Check spam folder, verify `MANAGER_EMAIL` |
| Cron not running | Verify `CRON_SECRET` is set, check Vercel plan |
| Empty emails | No chats yesterday (this is normal) |
| AI summary blank | Check `OPENROUTER_API_KEY` has credits |

---

## 📝 Where Everything Lives

```
api/
├── cron/
│   └── daily-summary.ts          # Email cron job
├── chat/
│   ├── webhook.ts                # Chat endpoint
│   ├── end-session.ts            # Saves to Supabase
│   └── trigger-summary.ts        # Manual test endpoint
src/
├── services/
│   ├── email.service.ts          # Resend integration
│   ├── supabase-database.service.ts  # Database ops
│   ├── kv-session.service.ts     # Vercel KV sessions
│   └── openrouter.service.ts     # AI summaries
└── types/
    └── index.ts                  # DailySummary interface
```

---

## 💡 Need Help?

**Full docs:** [CHAT_HISTORY_SETUP.md](./CHAT_HISTORY_SETUP.md)

**Common tasks:**
- Change email schedule → Edit `vercel.json`
- Add recipients → Update `MANAGER_EMAIL` in Vercel
- Customize branding → Edit `src/services/email.service.ts`
- View conversations → Query Supabase `conversations` table

---

**Ready to go!** Just add those 4 environment variables and you're live. 🎉
