# Docling RAG Chatbot - Quick Start Guide 🚀

Get your document-powered chatbot running in 5 minutes!

---

## What You'll Build

A production-ready RAG chatbot that:
- ✅ Processes PDF, TXT, and Markdown documents
- ✅ Uses intelligent chunking for optimal retrieval
- ✅ Answers questions based on your documents
- ✅ Sends daily email summaries at 5:30 AM
- ✅ Embeds on any website with one script tag

---

## Prerequisites

```bash
# 1. Node.js 18+ installed
node --version

# 2. API Keys ready:
# - Pinecone (https://pinecone.io)
# - OpenRouter (https://openrouter.ai)
# - Resend (https://resend.com)
```

---

## Installation

### Step 1: Install Dependencies

```bash
cd /Users/JCR/Downloads/mollieweb
npm install
```

### Step 2: Configure Environment

```bash
# Copy example env
cp .env.example .env

# Edit .env with your API keys
nano .env
```

Add your keys:
```env
PINECONE_API_KEY=pcsk_xxxxx
OPENROUTER_API_KEY=sk-or-xxxxx
RESEND_API_KEY=re_xxxxx
MANAGER_EMAIL=your-email@company.com
```

### Step 3: Create Pinecone Index

1. Go to https://app.pinecone.io
2. Click "Create Index"
3. Settings:
   - Name: `mollieweb-chatbot`
   - Dimensions: `1536`
   - Metric: `cosine`
4. Click Create

---

## Add Your Documents

### Method 1: Add Documents to Folder

```bash
# Create documents folder
mkdir documents

# Add your files (PDFs, TXT, or MD)
cp ~/your-docs/*.pdf documents/
cp ~/your-docs/*.txt documents/
```

### Method 2: Use Sample Documents

Create a test document:

```bash
cat > documents/sample.txt << 'EOF'
About Our Company

We are a leading provider of AI-powered solutions. Our products include:

1. RAG Chatbots - Intelligent chatbots powered by your documents
2. Custom AI Integration - Tailored AI solutions for your business
3. Consulting Services - Expert guidance on AI implementation

Contact us at hello@company.com or call (555) 123-4567.

Business Hours: Monday-Friday, 9 AM - 5 PM EST

Pricing:
- Starter: $99/month
- Professional: $299/month
- Enterprise: Custom pricing

We offer a 14-day free trial for all new customers.
EOF
```

---

## Embed Your Documents

```bash
npm run embed:docs
```

You'll see:
```
🚀 Starting Document Embedding Process
📄 Step 1: Processing documents with Docling...
   Processing: sample.txt

📊 Chunking Statistics:
   Total chunks: 8
   Average chunk size: 943 characters

🧮 Step 2: Creating embeddings with OpenRouter...
   Processing chunk 1/8... ✓
   Processing chunk 2/8... ✓
   ...

📤 Step 3: Uploading vectors to Pinecone...
   Uploading batch 1/1 (8 vectors)... ✓

✅ Document Embedding Complete!
```

---

## Start the Server

```bash
npm run dev
```

You should see:
```
╔═══════════════════════════════════════════════╗
║   Mollieweb RAG Chatbot Server Started       ║
╚═══════════════════════════════════════════════╝

🚀 Server running on port: 3000
🌐 Environment: development
📧 Manager email: your-email@company.com
⏰ Daily summary time: 05:30 (America/Chicago)
```

---

## Test Your Chatbot

### Option 1: Web Demo

1. Open browser: http://localhost:3000/widget.html
2. Click the chat button (bottom-right)
3. Ask: "What services do you offer?"
4. You should get an answer from your documents!

### Option 2: API Test

```bash
curl -X POST http://localhost:3000/api/chat/webhook \
  -H "Content-Type: application/json" \
  -d '{
    "message": "What are your business hours?"
  }'
```

Response:
```json
{
  "response": "Our business hours are Monday-Friday, 9 AM - 5 PM EST.",
  "sessionId": "uuid-here",
  "context": "Used 3 knowledge base entries"
}
```

---

## Embed on Your Website

Add this to your HTML before `</body>`:

```html
<script src="http://localhost:3000/embed.js"></script>
```

The chat widget will appear on your site!

**For production:** Change `localhost:3000` to your domain.

---

## Upload More Documents

### Via Command Line

```bash
curl -X POST http://localhost:3000/api/documents/upload \
  -F "document=@/path/to/your-file.pdf"
```

### Via Script

Add more files to `documents/` folder and re-run:
```bash
npm run embed:docs
```

---

## Test Daily Email Summary

```bash
curl -X POST http://localhost:3000/api/chat/trigger-summary
```

Check your email for the summary! 📧

---

## Customization

### Adjust Chunk Size

Edit `src/scripts/embedDocuments.ts`:

```typescript
const CHUNKING_OPTIONS = {
  chunkSize: 1500,     // Default: 1000
  chunkOverlap: 300,   // Default: 200
  preserveParagraphs: true,
};
```

Re-run: `npm run embed:docs`

### Change Email Time

Edit `.env`:

```env
SUMMARY_TIME=06:00      # 6:00 AM instead of 5:30 AM
TIMEZONE=America/New_York  # Your timezone
```

Restart server.

### Change AI Model

Edit `.env`:

```env
# Fast and cheap
OPENROUTER_MODEL=openai/gpt-3.5-turbo

# Best quality
OPENROUTER_MODEL=anthropic/claude-3.5-sonnet

# Open source
OPENROUTER_MODEL=meta-llama/llama-3.1-70b-instruct
```

---

## Troubleshooting

### "Cannot find documents folder"
```bash
mkdir documents
```

### "No vectors uploaded"
Check:
1. Pinecone API key is correct
2. Index name matches `.env`
3. Index dimensions = 1536

### "Email not sending"
Check:
1. Resend API key is valid
2. Manager email is correct
3. FROM_EMAIL domain is verified in Resend

### "Poor retrieval quality"
Try:
- Increase chunk overlap
- Adjust chunk size
- Add more documents
- Check if documents have extractable text

---

## Next Steps

1. ✅ **Add more documents** to improve knowledge base
2. ✅ **Customize widget design** in `public/embed.js`
3. ✅ **Set up production deployment** (see README.md)
4. ✅ **Configure authentication** for document uploads
5. ✅ **Monitor performance** and adjust chunk settings

---

## Resources

- **Full Documentation:** [README.md](README.md)
- **Docling Deep Dive:** [DOCLING_GUIDE.md](DOCLING_GUIDE.md)
- **Pinecone Docs:** https://docs.pinecone.io
- **OpenRouter Models:** https://openrouter.ai/models
- **Resend Docs:** https://resend.com/docs

---

## Getting Help

- Check the comprehensive [DOCLING_GUIDE.md](DOCLING_GUIDE.md)
- Review code examples in `src/scripts/embedDocuments.ts`
- Test with sample documents first
- Verify API keys are correct

---

**Congratulations! 🎉**

Your Docling-powered RAG chatbot is now running!

Add more documents, customize the experience, and deploy to production.

---

*Built with ❤️ using Docling, Pinecone, OpenRouter, and Resend*
