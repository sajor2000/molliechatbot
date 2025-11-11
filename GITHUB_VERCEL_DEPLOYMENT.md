# GitHub → Vercel Deployment Guide

## Overview

This guide walks you through:
1. Preparing your code for GitHub
2. Creating a GitHub repository
3. Pushing code to GitHub
4. Connecting GitHub to Vercel
5. Deploying to production
6. Configuring environment variables

**Estimated Time**: 30-45 minutes

---

## Prerequisites

Before starting:
- ✅ Local testing completed ([LOCAL_TESTING_GUIDE.md](LOCAL_TESTING_GUIDE.md))
- ✅ Git installed (`git --version`)
- ✅ GitHub account created
- ✅ Vercel account created (free tier)
- ✅ All API keys ready

---

## Step 1: Prepare Code for GitHub (5 minutes)

### 1.1 Create .gitignore

Your project should already have `.gitignore`, but verify it includes:

```bash
cat .gitignore
```

Should contain:
```
# Dependencies
node_modules/
venv/
__pycache__/

# Environment variables
.env
.env.local
.env.production

# Build outputs
dist/
.next/
.vercel/

# Logs
*.log
npm-debug.log*

# OS files
.DS_Store
Thumbs.db

# IDE
.vscode/
.idea/

# Temporary files
*.tmp
*.swp
processed-chunks.json
chunk-analysis-report.json
```

**Important**: `.env` should be in `.gitignore`! Never commit API keys!

### 1.2 Verify .env.example Exists

Check that `.env.example` has all variables (without actual secrets):

```bash
cat .env.example
```

Should show all required variables with placeholder values.

### 1.3 Initialize Git Repository (if not already done)

```bash
cd /Users/JCR/Downloads/mollieweb

# Check if already a git repo
git status

# If not, initialize
git init

# Configure git (if first time)
git config user.name "Your Name"
git config user.email "your.email@example.com"
```

---

## Step 2: Create GitHub Repository (5 minutes)

### 2.1 Create New Repository on GitHub

1. Go to: https://github.com/new
2. **Repository name**: `shoreline-dental-chatbot` (or your choice)
3. **Description**: "AI chatbot for Shoreline Dental Chicago with RAG, admin dashboard, and daily summaries"
4. **Visibility**:
   - **Private** (recommended - contains business logic)
   - OR Public (if open-sourcing)
5. **Do NOT initialize with**:
   - ❌ README (you already have one)
   - ❌ .gitignore (you already have one)
   - ❌ License (add later if needed)
6. Click **"Create repository"**

### 2.2 Note Repository URL

You'll get a URL like:
```
https://github.com/yourusername/shoreline-dental-chatbot.git
```

Save this for the next step!

---

## Step 3: Commit and Push Code (10 minutes)

### 3.1 Initial Commit

```bash
cd /Users/JCR/Downloads/mollieweb

# Add all files
git add .

# Verify what will be committed (check .env is NOT included!)
git status

# Should show:
# - All source files (api/, src/, public/, etc.)
# - Configuration files (package.json, vercel.json, etc.)
# - Documentation (.md files)
# Should NOT show:
# - .env (secrets!)
# - node_modules/ (dependencies)
# - dist/ (build output)

# Create initial commit
git commit -m "Initial commit: Shoreline Dental AI chatbot system

- RAG-powered chatbot with Pinecone vector database
- Admin dashboard for document uploads
- Test chat interface for internal testing
- Daily email summaries with AI-generated to-do items
- Embedded chat widget for website
- Complete documentation

Features:
- 376 optimized knowledge chunks
- Docling-based document processing
- OpenRouter AI integration (gpt-4o-mini)
- Supabase database for chat history
- Resend email service
- Password-protected admin access
- Multi-recipient email support

Cost: $5-15/month (OpenRouter only)
Status: Production ready"
```

### 3.2 Add Remote Repository

```bash
# Replace with YOUR GitHub URL
git remote add origin https://github.com/yourusername/shoreline-dental-chatbot.git

# Verify remote added
git remote -v
```

### 3.3 Push to GitHub

```bash
# Push to main branch
git push -u origin main

# If using 'master' instead of 'main':
# git branch -M main
# git push -u origin main
```

**Enter credentials when prompted** (or use SSH key if configured)

### 3.4 Verify on GitHub

1. Go to your repository URL
2. Refresh page
3. Verify all files are there
4. **Double-check**: `.env` should NOT be visible!

---

## Step 4: Connect GitHub to Vercel (10 minutes)

### 4.1 Sign Up / Login to Vercel

1. Go to: https://vercel.com/signup
2. Click **"Continue with GitHub"**
3. Authorize Vercel to access your GitHub account
4. Select your GitHub account/organization

### 4.2 Import GitHub Repository

1. On Vercel dashboard, click **"Add New..."** → **"Project"**
2. Find your repository: `shoreline-dental-chatbot`
3. Click **"Import"**

### 4.3 Configure Project Settings

**Framework Preset**:
- Select **"Other"** (this is a custom Node.js app)

**Root Directory**:
- Leave as `./` (project root)

**Build Command**:
```bash
npm run build
```

**Output Directory**:
```
dist
```

**Install Command**:
```bash
npm install
```

**Development Command** (optional):
```bash
npm run dev
```

### 4.4 Environment Variables (CRITICAL!)

**Before deploying**, click **"Environment Variables"** and add ALL variables from `.env.example`:

**Add each variable individually:**

| Variable Name | Value | Environment |
|---------------|-------|-------------|
| `NODE_ENV` | `production` | Production |
| `SUPABASE_URL` | Your actual URL | Production |
| `SUPABASE_KEY` | Your actual key | Production |
| `PINECONE_API_KEY` | Your actual key | Production |
| `PINECONE_INDEX_NAME` | `shoreline` | Production |
| `PINECONE_ENVIRONMENT` | `us-east-1-aws` | Production |
| `PINECONE_HOST` | Your actual host | Production |
| `OPENROUTER_API_KEY` | Your actual key | Production |
| `OPENROUTER_MODEL` | `openai/gpt-4o-mini` | Production |
| `OPENROUTER_EMBEDDING_MODEL` | `openai/text-embedding-3-small` | Production |
| `EMBEDDING_DIMENSIONS` | `512` | Production |
| `RESEND_API_KEY` | Your actual key | Production |
| `MANAGER_EMAIL` | `anel@shorelinedentalchicago.com,mollierojas@shorelinedentalchicago.com` | Production |
| `FROM_EMAIL` | Your verified domain email | Production |
| `TIMEZONE` | `America/Chicago` | Production |
| `SUMMARY_TIME` | `05:59` | Production |
| `CRON_SECRET` | Your secure random string | Production |
| `ADMIN_PASSWORD` | Your secure admin password | Production |

**💡 Tip**: Copy-paste from your local `.env` file to avoid typos!

### 4.5 Deploy!

1. Click **"Deploy"**
2. Watch the build logs
3. Wait 2-5 minutes for deployment

**Expected build output:**
```
> Installing dependencies...
> Running build command: npm run build
> Compiling TypeScript...
> Build completed
> Deployment ready
✅ Production: https://shoreline-dental-chatbot.vercel.app
```

### 4.6 Save Your Vercel URL

You'll get a URL like:
```
https://shoreline-dental-chatbot-abc123.vercel.app
```

**Save this!** You'll need it for:
- Testing the deployed app
- Embedding on website
- Sharing with staff

---

## Step 5: Verify Deployment (10 minutes)

### 5.1 Check Deployment Status

1. In Vercel dashboard, go to your project
2. Click **"Deployments"** tab
3. Latest deployment should show: ✅ **Ready**

### 5.2 Test Admin Dashboard

**URL**: `https://your-domain.vercel.app/admin`

1. Open in browser
2. Enter admin password
3. Should see dashboard
4. Try uploading a small test file
5. Verify success

### 5.3 Test Chat Interface

**URL**: `https://your-domain.vercel.app/test-chat`

1. Open in browser
2. Type: "What are your business hours?"
3. Should get response within 3-5 seconds
4. Verify accuracy

### 5.4 Test Chat Webhook API

```bash
curl -X POST https://your-domain.vercel.app/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your business hours?",
    "sessionId": "test-123"
  }'
```

Should return JSON with chatbot response.

### 5.5 Check Vercel Functions

1. Go to Vercel dashboard → Your project
2. Click **"Functions"** tab
3. Should see:
   - `/api/chat/webhook`
   - `/api/admin/auth`
   - `/api/admin/documents/upload`
   - `/api/cron/daily-summary`
   - And others

### 5.6 Check Cron Job

1. Go to Vercel dashboard → Your project
2. Click **"Settings"** → **"Cron Jobs"**
3. Should see:
   - Path: `/api/cron/daily-summary`
   - Schedule: `59 10 * * *` (10:59 AM UTC = 5:59 AM CDT)

---

## Step 6: Embed Widget on Website (5 minutes)

### 6.1 Update Widget Configuration

The widget URL needs to point to your Vercel deployment:

```html
<!-- Add to shorelinedentalchicago.com -->
<script src="https://your-domain.vercel.app/embed-shoreline.js"></script>
```

### 6.2 Add to Website

**WordPress:**
1. Appearance → Theme Editor
2. Open `footer.php`
3. Add before `</body>`:
```html
<!-- Shoreline Dental AI Chatbot -->
<script src="https://your-domain.vercel.app/embed-shoreline.js"></script>
```

**Squarespace:**
1. Settings → Advanced → Code Injection
2. Add to Footer:
```html
<script src="https://your-domain.vercel.app/embed-shoreline.js"></script>
```

**Other platforms:**
Add before closing `</body>` tag.

### 6.3 Test Embedded Widget

1. Visit https://www.shorelinedentalchicago.com
2. Chat button should appear (bottom-right)
3. Click to open
4. Send test message
5. Verify response

---

## Step 7: Configure Auto-Deploy (Optional)

### 7.1 Enable Auto-Deploy

Vercel automatically deploys when you push to GitHub!

**Workflow:**
```bash
# Make changes locally
git add .
git commit -m "Update: description of changes"
git push origin main

# Vercel auto-deploys in 2-3 minutes
# Check deployment status in Vercel dashboard
```

### 7.2 Set Up Preview Deployments

**For development branches:**

```bash
# Create feature branch
git checkout -b feature/new-feature

# Make changes and commit
git add .
git commit -m "Add new feature"
git push origin feature/new-feature
```

Vercel automatically creates a preview deployment!

**Preview URL**: `https://shoreline-dental-chatbot-git-feature-abc123.vercel.app`

Test on preview before merging to main.

---

## Step 8: Set Up Custom Domain (Optional)

### 8.1 Add Custom Domain

1. Go to Vercel dashboard → Your project
2. Click **"Settings"** → **"Domains"**
3. Add domain: `chatbot.shorelinedentalchicago.com` (or your choice)
4. Follow DNS configuration instructions

### 8.2 Configure DNS

In your domain registrar (e.g., GoDaddy, Namecheap):

**Add CNAME record:**
- **Type**: CNAME
- **Name**: `chatbot` (or subdomain of choice)
- **Value**: `cname.vercel-dns.com`
- **TTL**: Auto or 3600

**Wait 24-48 hours for propagation**

### 8.3 Update Embed Code

After custom domain is active:

```html
<script src="https://chatbot.shorelinedentalchicago.com/embed-shoreline.js"></script>
```

---

## Step 9: Monitor Deployment

### 9.1 Check Deployment Logs

1. Vercel dashboard → Your project
2. Click **"Deployments"**
3. Click latest deployment
4. View **"Build Logs"** and **"Function Logs"**

### 9.2 Monitor Function Execution

1. Go to **"Functions"** tab
2. See execution time, errors, invocations
3. Monitor for issues

### 9.3 Check Analytics

1. Go to **"Analytics"** tab
2. View:
   - Page views
   - Top pages
   - Bandwidth usage
   - Function invocations

---

## Step 10: Troubleshooting

### Deployment Failed

**Check build logs:**
1. Vercel dashboard → Deployments → Click failed deployment
2. Review error messages

**Common issues:**
- **Missing environment variable** → Add in Vercel settings
- **Build command failed** → Check package.json scripts
- **TypeScript errors** → Fix locally, push again
- **Dependency issues** → Run `npm install` locally

### Functions Timing Out

**If functions exceed 10 seconds (free tier limit):**

1. Upgrade to Vercel Pro ($20/month for 60s timeout)
2. OR optimize function (reduce complexity)

**Already configured**: `maxDuration: 60` in vercel.json

### Environment Variables Not Working

**Verify:**
1. All variables added in Vercel settings
2. Variable names match exactly (case-sensitive!)
3. Redeploy after adding variables

**Force redeploy:**
- Vercel dashboard → Deployments → Latest → Three dots → Redeploy

### CORS Errors

**If embedded widget not working:**

Check [src/server.ts](src/server.ts):
```typescript
const corsOptions = {
  origin: [
    'https://www.shorelinedentalchicago.com',
    'https://shorelinedentalchicago.com',
    // Add your Vercel domain
    'https://your-domain.vercel.app',
  ],
  credentials: true,
};
```

Update and redeploy if needed.

### Cron Job Not Running

**Verify:**
1. Vercel dashboard → Settings → Cron Jobs
2. Should show `/api/cron/daily-summary`
3. Schedule: `59 10 * * *`

**Test manually:**
```bash
curl -X GET https://your-domain.vercel.app/api/cron/daily-summary \
  -H "Authorization: Bearer YOUR_CRON_SECRET"
```

**Check email arrives**

---

## Step 11: Post-Deployment Checklist

### Verify Everything Works:

- [ ] Admin dashboard accessible at `/admin`
- [ ] Can login with admin password
- [ ] Can upload test document
- [ ] Document processed successfully
- [ ] Test chat works at `/test-chat`
- [ ] Chatbot responds accurately
- [ ] Embedded widget appears on website
- [ ] Widget sends/receives messages
- [ ] Messages save to Supabase
- [ ] Cron job scheduled correctly
- [ ] Manual email summary works
- [ ] All environment variables configured
- [ ] No errors in function logs
- [ ] Custom domain configured (if using)

---

## Step 12: Share with Team

### URLs to Share:

**For Staff:**
- **Admin Dashboard**: `https://your-domain.vercel.app/admin`
- **Password**: (share securely via password manager)
- **Test Chat**: `https://your-domain.vercel.app/test-chat`
- **Documentation**: [STAFF_UPLOAD_GUIDE.md](STAFF_UPLOAD_GUIDE.md)

**For Customers:**
- **Live Website**: https://www.shorelinedentalchicago.com
- Chat widget embedded (no URL needed)

---

## Ongoing Workflow

### Daily Development:

```bash
# 1. Make changes locally
nano src/somefile.ts

# 2. Test locally
npm run dev
# Test at http://localhost:3000

# 3. Commit changes
git add .
git commit -m "Fix: description of fix"

# 4. Push to GitHub
git push origin main

# 5. Vercel auto-deploys (2-3 min)
# Check: Vercel dashboard

# 6. Verify on production
# Visit: https://your-domain.vercel.app
```

### Rollback if Needed:

```bash
# In Vercel dashboard:
# 1. Go to Deployments
# 2. Find previous working deployment
# 3. Click three dots → "Promote to Production"
```

---

## Cost Summary

### GitHub:
- **Free** for unlimited public repos
- **Free** for unlimited private repos (personal account)

### Vercel Free Tier:
- ✅ Unlimited deployments
- ✅ 100 GB bandwidth/month
- ✅ Serverless Functions
- ✅ Automatic HTTPS
- ✅ Preview deployments
- ✅ Analytics

**Upgrade needed if:**
- Need > 10s function timeout → Pro ($20/month for 60s)
- Need > 100 GB bandwidth → Pro ($20/month)

**Current config**: Already set `maxDuration: 60` (requires Pro for production)

---

## Summary

✅ **Code on GitHub**: Version control, backup, collaboration
✅ **Auto-deploy from GitHub**: Push code → auto-deploy
✅ **Vercel hosting**: Serverless, scalable, fast
✅ **Environment variables**: Secure, separate from code
✅ **Custom domain**: Professional branded URL
✅ **Preview deployments**: Test before production
✅ **Easy rollbacks**: One-click revert

**Total setup time**: 30-45 minutes
**Ongoing workflow**: Push to GitHub → Auto-deploy
**Cost**: $0-20/month depending on usage

---

## Next Steps

1. ✅ Deploy to production (you just did!)
2. ✅ Test all features
3. ✅ Train staff on admin dashboard
4. ✅ Monitor email summaries
5. ✅ Gather feedback
6. ✅ Iterate and improve

**Your Shoreline Dental chatbot is now LIVE! 🎉**

---

**Last Updated**: 2025-01-11
**Estimated Time**: 30-45 minutes
**Cost**: Free tier (or $20/month Pro for extended timeouts)
