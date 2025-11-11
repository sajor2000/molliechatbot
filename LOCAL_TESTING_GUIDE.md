# Local Testing Guide

## Prerequisites

Before testing locally, ensure you have:

- ✅ Node.js 18+ installed
- ✅ npm or yarn package manager
- ✅ Python 3.9+ (for Docling scripts)
- ✅ Git installed
- ✅ API keys ready (Supabase, Pinecone, OpenRouter, Resend)

---

## Step 1: Install Dependencies

### 1.1 Install Node.js Dependencies

```bash
cd /Users/JCR/Downloads/mollieweb

# Install all npm packages
npm install

# This will install:
# - Express, CORS, body-parser (server)
# - TypeScript, ts-node (development)
# - Pinecone, Supabase, OpenRouter clients
# - Resend email service
# - Formidable, multer (file uploads)
# - pdf-parse (PDF processing)
# - And all other dependencies from package.json
```

Expected output:
```
added 247 packages, and audited 248 packages in 15s
```

### 1.2 Install Python Dependencies (for Docling)

```bash
# Create virtual environment
python3 -m venv venv

# Activate virtual environment
source venv/bin/activate  # On macOS/Linux
# OR
venv\Scripts\activate     # On Windows

# Install Python packages
pip install -r requirements.txt

# This will install:
# - docling 2.x
# - langchain-docling
# - HuggingFace transformers
# - And all dependencies
```

Expected output:
```
Successfully installed docling-2.61.2 langchain-docling-1.1.0 ...
```

---

## Step 2: Configure Environment Variables

### 2.1 Create .env File

```bash
# Copy example to actual .env
cp .env.example .env
```

### 2.2 Edit .env with Your API Keys

Open `.env` in your editor and replace placeholders:

```bash
# Use your actual values!
nano .env
# OR
code .env  # If using VS Code
```

**Required variables:**

```env
# Server
PORT=3000
NODE_ENV=development

# Supabase (get from https://supabase.com/dashboard/project/_/settings/api)
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_KEY=your_actual_supabase_anon_key

# Pinecone (get from https://app.pinecone.io/)
PINECONE_API_KEY=your_actual_pinecone_api_key
PINECONE_INDEX_NAME=shoreline
PINECONE_ENVIRONMENT=us-east-1-aws
PINECONE_HOST=https://shoreline-uabkyjr.svc.aped-4627-b74a.pinecone.io

# OpenRouter (get from https://openrouter.ai/keys)
OPENROUTER_API_KEY=your_actual_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4o-mini
OPENROUTER_EMBEDDING_MODEL=openai/text-embedding-3-small
EMBEDDING_DIMENSIONS=512

# Resend (get from https://resend.com/api-keys)
RESEND_API_KEY=your_actual_resend_api_key
MANAGER_EMAIL=anel@shorelinedentalchicago.com,mollierojas@shorelinedentalchicago.com
FROM_EMAIL=chatbot@yourdomain.com

# Timezone
TIMEZONE=America/Chicago
SUMMARY_TIME=05:30

# Secrets (generate strong random strings)
CRON_SECRET=generate_random_secret_abc123xyz
ADMIN_PASSWORD=generate_strong_password_here
```

**Generate secure secrets:**

```bash
# Generate CRON_SECRET
openssl rand -base64 32

# Generate ADMIN_PASSWORD
openssl rand -base64 20
```

---

## Step 3: Set Up Supabase Database

### 3.1 Create Database Tables

1. Go to: https://supabase.com/dashboard/project/_/sql
2. Click **"New query"**
3. Paste this SQL:

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

-- Create indexes
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

4. Click **"RUN"** (or press Cmd/Ctrl+Enter)
5. Verify: ✅ Success message appears

### 3.2 Create Storage Bucket

1. Go to: https://supabase.com/dashboard/project/_/storage/buckets
2. Click **"New bucket"**
3. Name: `documents`
4. Public bucket: **Yes** (or configure policies)
5. Click **"Create bucket"**

---

## Step 4: Upload Knowledge Base to Pinecone

### 4.1 Process Documents with Docling

```bash
# Activate Python virtual environment
source venv/bin/activate

# Run preprocessing script
npm run preprocess:docling

# This will:
# - Clean and optimize markdown files
# - Extract FAQs, business hours, pricing
# - Chunk content with Docling
# - Generate processed-chunks.json
```

Expected output:
```
✓ Loaded 40 markdown files from knowledge-base/
✓ Processing documents...
✓ Created 376 chunks
✓ Saved to processed-chunks.json
```

### 4.2 Analyze Chunks (Optional Quality Check)

```bash
npm run analyze:chunks

# This generates chunk-analysis-report.json
```

### 4.3 Upload to Pinecone

```bash
npm run upload:docling

# This will:
# - Read processed-chunks.json
# - Generate embeddings via OpenRouter
# - Upload vectors to Pinecone
# Time: 15-20 minutes
# Cost: ~$0.004 one-time
```

Expected output:
```
✓ Loaded 376 chunks
✓ Generating embeddings... (batch 1/4)
✓ Generating embeddings... (batch 2/4)
✓ Generating embeddings... (batch 3/4)
✓ Generating embeddings... (batch 4/4)
✓ Uploading to Pinecone... (batch 1/4)
✓ Uploading to Pinecone... (batch 2/4)
✓ Uploading to Pinecone... (batch 3/4)
✓ Uploading to Pinecone... (batch 4/4)
✅ Successfully uploaded 376 vectors to Pinecone
```

---

## Step 5: Start Local Server

### 5.1 Build TypeScript

```bash
npm run build

# Compiles TypeScript to JavaScript in dist/
```

### 5.2 Start Development Server

```bash
npm run dev

# Starts server with hot-reload
```

**OR for production build:**

```bash
npm start

# Starts production server
```

Expected output:
```
🚀 Server running on http://localhost:3000
📧 Email configured for 2 recipient(s)
✅ Environment variables loaded
```

### 5.3 Verify Server Running

Open browser to: http://localhost:3000

You should see the server responding (or a simple message).

---

## Step 6: Test Each Component Locally

### 6.1 Test Admin Dashboard

**URL**: http://localhost:3000/admin

**Test steps:**
1. Enter admin password (from .env ADMIN_PASSWORD)
2. Should see dashboard with upload area
3. Try uploading a small test PDF
4. Wait for processing (30-60 seconds)
5. Verify success message
6. Check document appears in table

**Troubleshooting:**
- "Unauthorized" → Check ADMIN_PASSWORD in .env
- "Upload failed" → Check Pinecone/Supabase keys
- Slow upload → Normal for first time (cold start)

### 6.2 Test Chat Interface

**URL**: http://localhost:3000/test-chat

**Test steps:**
1. Should see chat interface
2. Type: "What are your business hours?"
3. Press Enter
4. Wait for response (2-5 seconds)
5. Verify chatbot responds with Shoreline hours
6. Try other quick test buttons

**Troubleshooting:**
- No response → Check OpenRouter API key
- "I don't know" → Verify Pinecone has 376 vectors
- Connection error → Check all API keys

### 6.3 Test Chat Webhook API

**Using curl:**

```bash
curl -X POST http://localhost:3000/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your business hours?",
    "sessionId": "test-session-123"
  }'
```

Expected response:
```json
{
  "response": "We're open Monday-Friday 8:00 AM to 5:00 PM...",
  "sessionId": "test-session-123"
}
```

### 6.4 Test Document Upload API

**Using curl:**

```bash
curl -X POST http://localhost:3000/api/admin/documents/upload \
  -H "Authorization: Bearer YOUR_TOKEN_HERE" \
  -F "file=@/path/to/test.pdf"
```

First, get auth token:

```bash
curl -X POST http://localhost:3000/api/admin/auth \
  -H "Content-Type: application/json" \
  -d '{"password": "YOUR_ADMIN_PASSWORD"}'
```

### 6.5 Test Email Summary (Manual Trigger)

**Important**: Don't run this in production without auth!

```bash
curl -X GET http://localhost:3000/api/cron/daily-summary \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

Replace `YOUR_CRON_SECRET` with value from .env

Expected:
- Email sent to Anel & Mollie
- Check your email inbox

---

## Step 7: Test Embedded Widget Locally

### 7.1 Create Test HTML File

Create `test-embed.html`:

```html
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Embedded Chat</title>
</head>
<body>
  <h1>Test Page for Shoreline Dental Chat</h1>
  <p>The chat widget should appear in the bottom-right corner.</p>

  <!-- Embed chat widget -->
  <script>
    window.SHORELINE_CHAT_CONFIG = {
      apiBaseUrl: 'http://localhost:3000/api/chat'
    };
  </script>
  <script src="http://localhost:3000/embed-shoreline.js"></script>
</body>
</html>
```

### 7.2 Open in Browser

```bash
# On macOS
open test-embed.html

# On Linux
xdg-open test-embed.html

# On Windows
start test-embed.html
```

**Verify:**
- Chat button appears (bottom-right)
- Click to open chat
- Send test message
- Receive response

---

## Step 8: Common Issues & Fixes

### Issue: "Cannot find module '@pinecone-database/pinecone'"

**Fix:**
```bash
npm install @pinecone-database/pinecone
```

### Issue: "SUPABASE_URL is not defined"

**Fix:**
- Check `.env` file exists
- Verify variable names match exactly
- Restart server after editing .env

### Issue: "Pinecone index not found"

**Fix:**
1. Go to https://app.pinecone.io/
2. Create index named "shoreline"
3. Dimensions: 512
4. Metric: cosine
5. Update PINECONE_HOST in .env

### Issue: "Rate limit exceeded" (OpenRouter)

**Fix:**
- Wait 1 minute and retry
- Check OpenRouter dashboard for quota
- Consider upgrading OpenRouter plan

### Issue: Port 3000 already in use

**Fix:**
```bash
# Find process using port 3000
lsof -ti:3000

# Kill the process
kill -9 $(lsof -ti:3000)

# Or change PORT in .env
PORT=3001
```

### Issue: TypeScript compilation errors

**Fix:**
```bash
# Clean build
rm -rf dist/

# Rebuild
npm run build
```

### Issue: Python virtual environment issues

**Fix:**
```bash
# Deactivate current venv
deactivate

# Remove old venv
rm -rf venv/

# Create new venv
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

---

## Step 9: Verify Everything Works

### Checklist:

- [ ] Server starts without errors
- [ ] Admin dashboard loads at /admin
- [ ] Can login with admin password
- [ ] Can upload a test document
- [ ] Document appears in Supabase storage
- [ ] Pinecone vector count increases
- [ ] Test chat interface loads at /test-chat
- [ ] Chatbot responds to questions
- [ ] Responses are accurate and relevant
- [ ] Embedded widget works in test HTML
- [ ] Chat history saves to Supabase
- [ ] Manual email summary sends successfully

---

## Step 10: Check Logs

### Server Logs

Watch server console for:
- ✅ Green success messages
- ⚠️ Yellow warnings (non-critical)
- ❌ Red errors (need fixing)

### Browser Console

Open DevTools (F12) and check:
- Console tab: No JavaScript errors
- Network tab: API calls return 200 OK
- Application tab: localStorage has session data

### Database Logs

Check Supabase dashboard:
- SQL Editor → Run `SELECT * FROM conversations;`
- Should see test conversations

### Pinecone Logs

Check Pinecone dashboard:
- Index "shoreline" shows 376+ vectors
- Query stats show recent activity

---

## Ready for Deployment? ✅

If all local tests pass, you're ready to:
1. Commit code to GitHub
2. Deploy to Vercel
3. Configure production environment variables

See next guide: [GITHUB_VERCEL_DEPLOYMENT.md](GITHUB_VERCEL_DEPLOYMENT.md)

---

**Last Updated**: 2025-01-11
**Estimated Time**: 30-60 minutes
**Prerequisites**: Node.js, Python, API keys
