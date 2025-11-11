# Serverless Document Upload Pipeline 🚀

A lightweight, serverless-compatible document processing system for updating your RAG knowledge base directly from Vercel.

## Overview

This system replaces the heavy Docling preprocessing with a simple, serverless-compatible pipeline:

```
PDF/MD/TXT → Text Extraction → Chunking → OpenAI Embeddings → Pinecone Upload
```

**No Python dependencies required!** Everything runs in Node.js on Vercel serverless functions.

## Features

- ✅ **PDF Support**: Extract text from PDFs using `pdf-parse`
- ✅ **Markdown Support**: Process and normalize markdown files
- ✅ **Text Files**: Plain text document support
- ✅ **Smart Chunking**: Paragraph-based chunking with overlap (1000 chars, 200 overlap)
- ✅ **OpenAI Embeddings**: Uses `text-embedding-3-large` (1024 dimensions)
- ✅ **Pinecone Upload**: Automatic batch upload with metadata
- ✅ **10MB File Limit**: Suitable for most documents
- ✅ **60s Timeout**: Processes most documents within Vercel limits

## How to Use

### Method 1: Web Interface (Easiest)

1. Navigate to `/document-upload.html` on your deployed site
2. Enter your admin key (same as `CRON_SECRET`)
3. Select a PDF, Markdown, or Text file
4. Click "Upload & Process"
5. Wait for confirmation

### Method 2: API Request (Programmatic)

**Endpoint**: `POST /api/admin/documents/process`

**Headers**:
```
Content-Type: application/json
x-admin-key: YOUR_CRON_SECRET
```

**Body**:
```json
{
  "file": "BASE64_ENCODED_FILE_DATA",
  "filename": "document.pdf",
  "adminKey": "YOUR_CRON_SECRET"
}
```

**Example with curl**:
```bash
# Convert file to base64
FILE_BASE64=$(base64 -i document.pdf)

curl -X POST https://your-app.vercel.app/api/admin/documents/process \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_CRON_SECRET" \
  -d "{
    \"file\": \"$FILE_BASE64\",
    \"filename\": \"document.pdf\",
    \"adminKey\": \"YOUR_CRON_SECRET\"
  }"
```

**Example with JavaScript**:
```javascript
async function uploadDocument(file, adminKey) {
  const reader = new FileReader();

  reader.onload = async () => {
    const base64 = reader.result.split(',')[1];

    const response = await fetch('/api/admin/documents/process', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-admin-key': adminKey,
      },
      body: JSON.stringify({
        file: base64,
        filename: file.name,
        adminKey: adminKey,
      }),
    });

    const result = await response.json();
    console.log(result);
  };

  reader.readAsDataURL(file);
}
```

## Processing Pipeline

### 1. Text Extraction

**PDF Files**:
- Uses `pdf-parse` library
- Extracts all text content from PDF
- Handles multi-page documents

**Markdown Files**:
- Removes code block formatting
- Strips HTML tags
- Normalizes whitespace
- Preserves structure

**Text Files**:
- Direct UTF-8 text extraction
- No preprocessing needed

### 2. Chunking Strategy

```typescript
chunkText(text, maxChunkSize: 1000, overlap: 200)
```

- Splits by paragraphs first
- Maximum chunk size: 1000 characters
- Overlap: 200 characters (context preservation)
- Maintains semantic boundaries

### 3. Embedding Generation

- Model: `text-embedding-3-large`
- Dimensions: 1024
- Batch size: 50 texts per request
- Rate limiting: 1 second delay between batches

### 4. Pinecone Upload

- Batch size: 100 vectors per upsert
- Metadata includes:
  - `text`: Original chunk text
  - `filename`: Source file name
  - `uploadedAt`: ISO timestamp
  - `chunkIndex`: Position in document
  - `source`: "serverless-upload"

## Configuration

All configuration is handled through environment variables (already set in your `.env`):

```bash
OPENAI_API_KEY=sk-proj-...
EMBEDDING_MODEL=text-embedding-3-large
EMBEDDING_DIMENSIONS=1024
PINECONE_API_KEY=pcsk_...
PINECONE_INDEX_NAME=chatbot
CRON_SECRET=your_admin_key
```

## File Size Limits

- **Maximum file size**: 10MB
- **Recommended**: Keep documents under 5MB for faster processing
- **Timeout**: 60 seconds (Vercel Pro: 300 seconds)

## Comparison: Docling vs Serverless

| Feature | Docling (Local) | Serverless |
|---------|----------------|------------|
| Dependencies | 3GB+ (PyTorch, CUDA) | ~10MB (Node.js) |
| Processing Time | 2-5 minutes | 10-30 seconds |
| Deployment | Local only | Vercel compatible |
| Quality | Excellent (ML-based) | Good (rule-based) |
| Setup | Complex | Simple |
| Cost | Free (local compute) | ~$0.0004/1K tokens |

## When to Use Each Method

**Use Docling (Local)**:
- Large batch preprocessing (100+ documents)
- Complex PDFs with tables, images, formulas
- One-time knowledge base setup
- Maximum quality extraction

**Use Serverless Upload**:
- Adding new documents to existing knowledge base
- Quick updates and corrections
- Remote uploads from anywhere
- Simple PDFs and markdown files

## Troubleshooting

### "Processing failed" Error
- Check file size (< 10MB)
- Verify file is valid PDF/MD/TXT
- Check admin key matches `CRON_SECRET`

### "Timeout" Error
- File too large or complex
- Try splitting into smaller documents
- Use local Docling for complex PDFs

### "Rate limit exceeded" (OpenAI)
- Wait 1 minute and retry
- Reduce document size
- Upgrade OpenAI tier

### "Invalid admin key"
- Ensure `x-admin-key` header matches `CRON_SECRET`
- Check for trailing spaces in key

## Security

- **Authentication**: Admin key required (CRON_SECRET)
- **HTTPS Only**: Secure transmission
- **No public access**: Admin-only endpoint
- **File validation**: Type and size checks
- **Error sanitization**: No sensitive data in errors

## API Response Format

**Success**:
```json
{
  "success": true,
  "chunks": 15,
  "message": "Successfully processed document.pdf - created 15 vectors"
}
```

**Error**:
```json
{
  "error": "Processing failed",
  "message": "Extracted text is too short or empty"
}
```

## Future Enhancements

Potential improvements:
- Image OCR support (using Anthropic Claude Vision)
- Word/Excel document support
- Multi-language support
- Batch upload endpoint
- Progress tracking
- Vector update/delete endpoints

## Support

For issues or questions:
1. Check logs in Vercel dashboard
2. Review error messages
3. Test with small documents first
4. Verify environment variables

---

**Built for**: Shoreline Dental RAG Chatbot
**Compatible with**: Vercel, OpenAI, Pinecone
**License**: MIT
