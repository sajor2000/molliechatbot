# Staff Document Upload Guide

## Overview

The **Admin Dashboard** allows Shoreline Dental staff to upload documents (PDFs, text files, markdown) that will be automatically processed and added to the chatbot's knowledge base. This extends the chatbot beyond just website content.

**Access URL**: `https://your-vercel-domain.com/admin`

**Cost**: $0 additional (uses existing infrastructure)

---

## What Can Staff Upload?

### Supported File Types:
- **PDF** (.pdf) - Patient information sheets, service brochures, insurance forms
- **Text** (.txt) - FAQs, policies, procedures
- **Markdown** (.md) - Formatted documentation, guides

### File Size Limit:
- Maximum **10MB** per file

### Use Cases:
✅ **New Services**: Upload brochures about new dental procedures
✅ **Seasonal Promotions**: Add temporary offers not on website
✅ **Patient Education**: Upload detailed care instructions
✅ **Internal Policies**: Add insurance coverage details
✅ **FAQs**: Expand chatbot knowledge with common questions
✅ **Event Information**: Upload details about special events

---

## Getting Started

### Step 1: Set Admin Password

During deployment, add a secure admin password to your environment variables:

```bash
# In Vercel Dashboard → Settings → Environment Variables
ADMIN_PASSWORD=your_secure_password_here
```

**Security Tips**:
- Use a strong password (12+ characters, mixed case, numbers, symbols)
- Don't share the password publicly
- Change periodically for security
- Consider using a password manager

### Step 2: Access Admin Dashboard

1. Navigate to: `https://your-vercel-domain.com/admin`
2. Enter admin password
3. Click "Login"

**First-time setup**: Share the password only with authorized staff (Anel, Mollie, etc.)

---

## Using the Dashboard

### Login Screen

<img src="https://placeholder-admin-login.png" alt="Admin Login" width="400">

- Enter the admin password
- Session lasts 24 hours
- Token stored securely in browser

### Dashboard Overview

Once logged in, you'll see two main sections:

#### 1. **Upload New Document** Section
- Drag-and-drop area for easy uploading
- Or click "Select File" to browse
- Real-time progress indicator
- Success/error notifications

#### 2. **Uploaded Documents** Section
- Table of all uploaded documents
- File name, size, upload date
- Delete button for each document
- Refresh button to reload list

---

## Uploading a Document

### Method 1: Drag and Drop

1. Find your document file on your computer
2. Drag the file to the upload area (turns blue when ready)
3. Drop the file
4. Wait for processing to complete (usually 30-60 seconds)

### Method 2: Select File

1. Click **"Select File"** button
2. Browse to your document
3. Select the file and click "Open"
4. Wait for processing to complete

### What Happens During Upload?

The system performs these steps automatically:

```
1. ⬆️  Upload file to server
2. 📄 Extract text content from document
3. ✂️  Chunk document into manageable pieces (using Docling)
4. 🔢 Generate AI embeddings for each chunk
5. 📊 Index in Pinecone vector database
6. 💾 Store original file in Supabase
7. ✅ Update chatbot knowledge base
```

**Processing Time**: 30-60 seconds depending on document size

### Progress Indicator

You'll see real-time status updates:
- "Uploading file..." (10%)
- "Chunking document..." (40%)
- "Generating embeddings..." (70%)
- "Indexing in Pinecone..." (90%)
- "Complete!" (100%)

### Success Confirmation

After successful upload, you'll see:

```
✅ Successfully uploaded document-name.pdf!
📊 Created 23 chunks
🔢 Indexed 23 vectors
The chatbot knowledge base has been updated.
```

The chatbot can now answer questions about this content **immediately**!

---

## Managing Documents

### Viewing Uploaded Documents

The documents table shows:
- **Filename**: Original name of uploaded file
- **Size**: File size (KB/MB)
- **Uploaded**: Date and time of upload
- **Actions**: Delete button

### Deleting a Document

**When to delete:**
- Outdated promotions or seasonal content
- Incorrect information uploaded by mistake
- Superseded by newer version

**How to delete:**

1. Find the document in the table
2. Click the **"🗑️ Delete"** button
3. Confirm deletion in the popup modal
4. Document is removed from:
   - Chatbot knowledge base (Pinecone vectors)
   - File storage (Supabase)

**⚠️ Warning**: Deletion is permanent and cannot be undone!

### Refreshing the List

Click **"🔄 Refresh"** to reload the documents table with the latest data.

---

## Best Practices

### Document Preparation

**Before uploading:**

1. **Review Content**: Ensure information is accurate and current
2. **Clear Formatting**: Use clear headings and structure
3. **Remove Duplicates**: Don't upload if content already on website
4. **Descriptive Filenames**: Use clear names like `teeth-whitening-pricing-2025.pdf`

**Good Document Structure:**
```
Title: Teeth Whitening Services

Overview:
Professional teeth whitening at Shoreline Dental...

Pricing:
- In-office whitening: $450
- Take-home kit: $275

How it works:
1. Initial consultation
2. Treatment plan
3. Whitening procedure
...
```

### Organizing Content

**File Naming Convention:**
- `service-teeth-whitening.pdf` - Service information
- `promo-spring-2025.txt` - Seasonal promotion
- `faq-invisalign.md` - Frequently asked questions
- `policy-insurance-coverage.pdf` - Policy documents

### Updating Content

**To update existing information:**

1. Delete the old document
2. Upload the new version with updated content
3. Keep the same filename for consistency

**Or:**
1. Upload with a new filename (e.g., `pricing-2025-updated.pdf`)
2. Delete the old version afterward

### When to Upload

**Upload documents when:**
- ✅ Launching new services not yet on website
- ✅ Running time-limited promotions
- ✅ Patients frequently ask questions not covered by chatbot
- ✅ Adding detailed procedural information
- ✅ Seasonal changes (holiday hours, special offers)

**Don't upload when:**
- ❌ Content is already on website (avoid duplicates)
- ❌ Information is confidential/private (HIPAA concerns)
- ❌ Content is temporary test data
- ❌ File is corrupt or unreadable

---

## Troubleshooting

### "Invalid file type" Error

**Problem**: File type not supported

**Solution**:
- Only PDF, TXT, and MD files are accepted
- Check file extension (.pdf, .txt, .md)
- Convert Word docs to PDF first

### "File too large" Error

**Problem**: File exceeds 10MB limit

**Solution**:
- Compress PDF file (use Adobe Acrobat or online tools)
- Split large documents into multiple smaller files
- Remove unnecessary images from PDF

### "Upload failed" Error

**Problem**: Network or server error

**Solutions**:
- Check internet connection
- Refresh the page and try again
- Try a different browser
- Contact system administrator if persists

### "Invalid or expired token" Error

**Problem**: Session expired (after 24 hours)

**Solution**:
- Click "Logout"
- Log back in with admin password
- Your work is saved; documents remain uploaded

### Document Not Appearing in List

**Problem**: Upload succeeded but document not visible

**Solutions**:
- Click "🔄 Refresh" button
- Hard refresh browser (Ctrl+Shift+R or Cmd+Shift+R)
- Check if upload actually completed successfully

### Chatbot Not Using Uploaded Content

**Problem**: Chatbot doesn't seem to know about uploaded content

**Solutions**:
- Wait 1-2 minutes for indexing to fully complete
- Test with specific questions about the uploaded content
- Ensure content is clear and well-structured
- Check that document actually uploaded successfully

---

## Security & Privacy

### Password Security

- Admin password should be **strong and unique**
- Share only with authorized staff
- Don't write password in public places
- Change password periodically

### Session Management

- Sessions expire after **24 hours**
- Automatically logged out on browser close (if configured)
- Token stored in browser's local storage
- Click "Logout" when done for security

### Data Privacy

**What's Safe to Upload:**
- ✅ Public service information
- ✅ General FAQs
- ✅ Pricing and promotional materials
- ✅ Educational content

**Never Upload:**
- ❌ Patient medical records (HIPAA violation)
- ❌ Staff personal information
- ❌ Credit card or payment information
- ❌ Private internal communications

### Access Control

- Only staff with admin password can upload
- All uploads are logged
- Consider changing password if staff leaves

---

## Example Workflows

### Workflow 1: Adding New Service Information

**Scenario**: Shoreline adds new Invisalign Teen service

1. Create PDF with service details:
   - Description of Invisalign Teen
   - Pricing: $3,500-$5,000
   - Age requirements: 12-18 years
   - Treatment duration: 12-18 months
   - Before/after care instructions

2. Access admin dashboard: `https://your-domain.com/admin`

3. Upload `service-invisalign-teen.pdf`

4. Wait for "Successfully uploaded" confirmation

5. Test chatbot: Ask "Do you offer Invisalign for teenagers?"

6. Chatbot now responds with accurate Invisalign Teen information!

### Workflow 2: Seasonal Promotion

**Scenario**: Holiday teeth whitening promotion (December 2025)

1. Create text file: `promo-holiday-whitening-dec2025.txt`

```
Holiday Teeth Whitening Special - December 2025

Get your smile ready for the holidays!

Promotion:
- 20% off professional teeth whitening
- Valid: December 1-31, 2025
- In-office: $360 (regular $450)
- Take-home kit: $220 (regular $275)

Book now: Call (312) 266-3399
Limited slots available!
```

2. Upload via admin dashboard

3. Customers can now ask about holiday specials

4. **After December 31**: Delete the promotion file

5. Upload new promotion for next season

### Workflow 3: Patient Education Material

**Scenario**: Post-implant care instructions

1. Convert existing care instructions to PDF

2. Upload `patient-care-dental-implants.pdf`

3. Chatbot can now answer detailed post-op questions

4. Reduces phone calls for basic care questions

5. Update document as procedures change

---

## Technical Details

### Processing Pipeline

```
User uploads file
    ↓
Formidable parser (Vercel serverless)
    ↓
DoclingService extracts text
    ↓
HybridChunker splits into chunks
  - Max 1000 characters per chunk
  - 200 character overlap
    ↓
OpenRouter generates embeddings
  - Model: text-embedding-3-small
  - Dimensions: 512
    ↓
Pinecone indexes vectors
  - Batch upload (100 vectors/batch)
    ↓
Supabase stores original file
  - Bucket: "documents"
    ↓
Knowledge base updated
Chatbot ready to answer questions!
```

### Metadata Stored

Each uploaded document chunk includes:
- **source**: Original filename
- **content**: Text content of chunk
- **uploadedAt**: Timestamp
- **uploadedBy**: "admin"
- **page**: Page number (for PDFs)
- Custom metadata from DoclingService

### API Endpoints

All admin endpoints require authentication token:

- `POST /api/admin/auth` - Login (get token)
- `POST /api/admin/documents/upload` - Upload document
- `GET /api/admin/documents/list` - List all documents
- `DELETE /api/admin/documents/delete?filename=...` - Delete document

---

## FAQ

### How long until chatbot uses uploaded content?

**Immediately!** The chatbot can answer questions about uploaded content as soon as the upload completes (30-60 seconds).

### Can I upload the same file twice?

Yes, but it will create duplicate content in the knowledge base. Better to delete the old version first.

### What if I upload wrong information?

Delete the document immediately via the dashboard. The chatbot will stop using that content right away.

### Can multiple staff upload simultaneously?

Yes! The system supports concurrent uploads from multiple users.

### How many documents can I upload?

Unlimited (within Pinecone/Supabase free tier limits). Practical limit is around 100-200 documents for optimal performance.

### Can I download uploaded documents?

Yes, documents are stored in Supabase storage. Contact system administrator for access to the storage bucket.

### Will uploaded documents slow down the chatbot?

No! Vector search remains fast regardless of knowledge base size. Response time stays under 2 seconds.

### Can I bulk upload multiple files?

Currently, upload one file at a time. For bulk uploads, contact system administrator.

---

## Support

### For Technical Issues:

- Check this guide's Troubleshooting section
- Verify environment variables are configured correctly
- Check Vercel deployment logs
- Review browser console for errors (F12)

### For Content Questions:

- Ensure documents are well-formatted
- Test specific questions with chatbot
- Review uploaded content structure
- Consider splitting very long documents

### Contact Information:

**System Administrator**: [Your contact info]
**Dashboard URL**: https://your-vercel-domain.com/admin
**Documentation**: See DEPLOYMENT_GUIDE.md for full technical details

---

## Summary

✅ **Simple**: Drag-and-drop interface, no technical knowledge needed
✅ **Fast**: 30-60 seconds from upload to chatbot ready
✅ **Secure**: Password-protected, session-based authentication
✅ **Flexible**: Support for PDF, TXT, MD files up to 10MB
✅ **Powerful**: Automatic chunking, embedding, and indexing
✅ **Cost-effective**: $0 additional cost, uses existing infrastructure

**The admin dashboard puts chatbot knowledge management directly in staff hands!**

---

**Last Updated**: 2025-01-11
**Version**: 1.0
**For**: Shoreline Dental Chicago Staff
