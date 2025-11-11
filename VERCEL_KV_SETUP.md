# Vercel KV Setup Guide

## Overview
This chatbot now uses Vercel KV (Redis) for:
- **Session Management** - Persistent chat sessions across serverless cold starts
- **Authentication Tokens** - Secure admin token storage
- **Rate Limiting** - IP-based rate limiting to prevent abuse

## Prerequisites
- Vercel account with a deployed project
- Access to Vercel dashboard

---

## Step 1: Create Vercel KV Database

### Option A: Via Vercel Dashboard (Recommended)

1. **Navigate to Storage**
   - Go to https://vercel.com/dashboard
   - Select your project
   - Click **Storage** tab
   - Click **Create Database**

2. **Create KV Store**
   - Select **KV (Redis)**
   - Choose a name (e.g., `mollieweb-kv`)
   - Select region closest to your users (e.g., `us-east-1`)
   - Click **Create**

3. **Connect to Project**
   - Select your KV database
   - Click **Connect Project**
   - Select your project from dropdown
   - Click **Connect**

4. **Environment Variables Auto-Set**
   Vercel automatically adds these to your project:
   ```
   KV_REST_API_URL
   KV_REST_API_TOKEN
   KV_REST_API_READ_ONLY_TOKEN
   KV_URL
   ```

### Option B: Via Vercel CLI

```bash
# Create KV database
vercel env add KV_REST_API_URL production
vercel env add KV_REST_API_TOKEN production

# Or link existing Upstash database
vercel link
vercel env pull .env.local
```

---

## Step 2: Generate Admin Password Hash

Your admin password must be hashed with bcrypt before storing in environment variables.

### Method 1: Node.js Script (Recommended)

```bash
# Generate hash for your password
npx tsx -e "import bcrypt from 'bcrypt'; bcrypt.hash('your-secure-password', 10).then(console.log)"

# Output will be something like:
# $2b$10$rXK9Z1YQ5jH7xGm3nD8F9uYvH8bK2lP3qR4wN5tE6aS7dV9fG0hI.
```

### Method 2: Online Tool

1. Go to https://bcrypt-generator.com
2. Enter your password
3. Select **10 rounds**
4. Click **Generate**
5. Copy the hash (starts with `$2b$10$`)

### Method 3: Python Script

```python
import bcrypt
password = "your-secure-password"
hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(rounds=10))
print(hash.decode('utf-8'))
```

---

## Step 3: Set Environment Variables in Vercel

### Via Vercel Dashboard

1. Go to **Project Settings** → **Environment Variables**
2. Add the following variables:

#### Required Variables

| Variable | Value | Description |
|----------|-------|-------------|
| `ADMIN_PASSWORD_HASH` | `$2b$10$...` | Bcrypt hash of admin password |
| `KV_REST_API_URL` | Auto-set by Vercel | Redis REST API URL |
| `KV_REST_API_TOKEN` | Auto-set by Vercel | Redis API token |

3. Set environment scope:
   - ✅ Production
   - ✅ Preview
   - ✅ Development (if testing locally)

4. Click **Save**

### Via Vercel CLI

```bash
# Set admin password hash
vercel env add ADMIN_PASSWORD_HASH production
# Paste your bcrypt hash when prompted

# Verify KV variables are set
vercel env ls
```

---

## Step 4: Test Locally (Optional)

### Pull Environment Variables

```bash
# Pull production environment variables to .env.local
vercel env pull .env.local
```

### Update .env.local

Add/verify these variables in `.env.local`:
```env
# Vercel KV (from vercel env pull)
KV_REST_API_URL=https://your-kv-url.upstash.io
KV_REST_API_TOKEN=your_token_here

# Admin Password Hash (bcrypt)
ADMIN_PASSWORD_HASH=$2b$10$YourHashHere

# Keep other existing variables...
OPENAI_API_KEY=sk-...
PINECONE_API_KEY=...
```

### Run Locally

```bash
npm run dev
```

### Test Authentication

```bash
# Test login endpoint
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password": "your-secure-password"}'

# Should return:
# {"success": true, "token": "...", "expiresIn": 86400}
```

---

## Step 5: Deploy to Vercel

```bash
# Commit changes
git add .
git commit -m "feat: implement Vercel KV for sessions and auth"

# Push to trigger deployment
git push origin main
```

Vercel will automatically:
1. Install new dependencies (@vercel/kv, @upstash/ratelimit, bcrypt)
2. Build with TypeScript
3. Deploy serverless functions
4. Connect to KV database

---

## Step 6: Verify Deployment

### Check Deployment Logs

1. Go to Vercel Dashboard → Deployments
2. Click on latest deployment
3. Check **Build Logs** for errors
4. Check **Function Logs** for runtime errors

### Test Production Endpoints

```bash
# Test rate limiting on chat (30 messages/minute)
curl -X POST https://your-domain.vercel.app/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello", "sessionId": "test-123"}'

# Test admin authentication (5 attempts/15 minutes)
curl -X POST https://your-domain.vercel.app/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password": "your-secure-password"}'
```

### Monitor KV Usage

1. Go to Vercel Dashboard → Storage → Your KV Database
2. Check **Metrics** tab:
   - Daily requests
   - Storage used
   - Command latency

---

## Troubleshooting

### Error: "Cannot connect to KV"

**Solution:**
```bash
# Verify KV environment variables are set
vercel env ls

# Re-pull environment variables
vercel env pull .env.local

# Redeploy
vercel --prod
```

### Error: "ADMIN_PASSWORD_HASH not configured"

**Solution:**
1. Generate password hash (see Step 2)
2. Add to Vercel environment variables
3. Redeploy

### Error: "Rate limit error"

**Solution:**
- Ensure `@upstash/ratelimit` is installed
- Verify KV_REST_API_URL and KV_REST_API_TOKEN are set
- Check KV database is in same region as functions

### Sessions Not Persisting

**Check:**
1. KV database is connected to project
2. Environment variables are set in production
3. Functions are using latest deployment
4. No errors in function logs

### High KV Costs

**Optimize:**
- Sessions TTL: 1 hour (3600 seconds)
- Tokens TTL: 24 hours (86400 seconds)
- Rate limit windows: Use appropriate timeframes
- Monitor usage in Vercel Dashboard

---

## Security Best Practices

### Password Security
✅ **DO:**
- Use bcrypt with 10+ rounds
- Store only hashes in environment variables
- Use strong passwords (12+ characters)
- Rotate passwords periodically

❌ **DON'T:**
- Store plain text passwords
- Commit passwords to git
- Use weak passwords
- Share admin credentials

### KV Token Security
✅ **DO:**
- Keep KV_REST_API_TOKEN secret
- Use read-only token for public operations
- Rotate tokens if compromised
- Monitor KV access logs

❌ **DON'T:**
- Expose tokens in client-side code
- Commit tokens to git
- Use same token across environments

### Rate Limiting
Current limits:
- **Authentication:** 5 attempts per 15 minutes per IP
- **Chat:** 30 messages per minute per IP
- **File Upload:** 10 uploads per hour per IP

Adjust in `src/middleware/rate-limit.middleware.ts` if needed.

---

## Cost Estimation

### Vercel KV Pricing (as of 2025)
- **Free Tier:** 3,000 commands/day
- **Pro:** $0.20 per 100,000 commands
- **Enterprise:** Custom pricing

### Expected Usage
For 1,000 chat messages/day:
- Session operations: ~3,000 commands (read + write)
- Auth operations: ~100 commands
- Rate limit checks: ~3,100 commands
- **Total:** ~6,200 commands/day

**Cost:** Free tier sufficient for up to 1,500 messages/day

---

## Migration from In-Memory Storage

### What Changed

**Before (In-Memory Map):**
```typescript
const activeSessions = new Map<string, Conversation>();
activeSessions.set(sessionId, conversation);
```

**After (Vercel KV):**
```typescript
import { kvSessionService } from './services/kv-session.service';
await kvSessionService.setSession(sessionId, conversation);
```

### Benefits
- ✅ Sessions persist across cold starts
- ✅ Multiple function instances share state
- ✅ Automatic expiration (TTL)
- ✅ Scalable and production-ready

---

## Next Steps

1. ✅ Vercel KV database created
2. ✅ Environment variables configured
3. ✅ Admin password hashed and stored
4. ✅ Application deployed
5. ⏭️ Test all endpoints
6. ⏭️ Monitor KV usage
7. ⏭️ Configure alerts for errors
8. ⏭️ Set up rate limit adjustments if needed

---

## Support

- **Vercel KV Docs:** https://vercel.com/docs/storage/vercel-kv
- **Upstash Redis Docs:** https://docs.upstash.com/redis
- **Rate Limiting Guide:** https://upstash.com/docs/oss/sdks/ts/ratelimit/overview

---

**Last Updated:** 2025-11-11
**Version:** 1.0.0
