# Admin Dashboard - Quick Start

## 🎯 What Is This?

A secure web dashboard that lets Shoreline Dental staff upload documents (PDFs, text files, markdown) to expand the chatbot's knowledge base.

**Access**: `https://your-vercel-domain.com/admin`

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Set Password in Vercel

```bash
# In Vercel Dashboard → Settings → Environment Variables
ADMIN_PASSWORD=YourSecurePassword123!
```

### Step 2: Deploy

```bash
vercel --prod
```

### Step 3: Login

Visit `https://your-vercel-domain.com/admin` and enter your password.

**That's it!** 🎉

---

## 📤 How to Upload Documents

### Option 1: Drag & Drop
1. Drag your file to the upload area
2. Drop it
3. Wait 30-60 seconds
4. Done! Chatbot can now answer questions about it

### Option 2: Click to Select
1. Click "Select File" button
2. Choose your file
3. Wait for processing
4. Done!

---

## 📋 Supported Files

✅ **PDF** (.pdf) - Up to 10MB
✅ **Text** (.txt) - Up to 10MB
✅ **Markdown** (.md) - Up to 10MB

---

## 🗑️ Delete Documents

1. Find document in the table
2. Click "🗑️ Delete" button
3. Confirm deletion
4. Done! Chatbot stops using that content

---

## 💡 What to Upload

### Good Use Cases:
- ✅ New service information not on website
- ✅ Seasonal promotions
- ✅ Detailed FAQs
- ✅ Patient education materials
- ✅ Insurance coverage details
- ✅ Special event information

### Don't Upload:
- ❌ Content already on website (creates duplicates)
- ❌ Patient medical records (HIPAA violation)
- ❌ Confidential information
- ❌ Files larger than 10MB

---

## 📚 Documentation

- **Staff Guide**: See [STAFF_UPLOAD_GUIDE.md](STAFF_UPLOAD_GUIDE.md) for detailed instructions
- **Technical Details**: See [STAFF_UPLOAD_IMPLEMENTATION.md](STAFF_UPLOAD_IMPLEMENTATION.md)
- **Deployment**: See [QUICK_START_DEPLOYMENT.md](QUICK_START_DEPLOYMENT.md)

---

## 🔐 Security

- Password-protected access
- 24-hour session expiration
- Secure token authentication
- File type validation
- Size limits enforced

**Keep your password secure!** Only share with authorized staff.

---

## 💰 Cost

**$0 additional!** Uses existing Vercel/Pinecone/Supabase infrastructure.

Only cost: ~$0.0001 per document upload (OpenRouter embeddings)

---

## ⚡ Processing Time

- **Small files** (< 100KB): 20-30 seconds
- **Medium files** (1MB): 30-45 seconds
- **Large files** (5MB+): 45-90 seconds

The chatbot can answer questions **immediately** after processing completes!

---

## 🆘 Need Help?

**Common Issues:**

**"Invalid password"**
→ Double-check password in Vercel environment variables

**"File too large"**
→ Maximum 10MB. Compress your PDF or split into smaller files

**"Invalid file type"**
→ Only PDF, TXT, and MD files supported

**Document not appearing**
→ Click the "🔄 Refresh" button

**More help**: See [STAFF_UPLOAD_GUIDE.md](STAFF_UPLOAD_GUIDE.md) troubleshooting section

---

## 🎓 Example Workflow

**Scenario**: Adding teeth whitening promotion

1. Create `promo-whitening-feb2025.txt`:
   ```
   February Teeth Whitening Special

   20% off all whitening services!
   Valid Feb 1-28, 2025

   In-office: $360 (reg $450)
   Take-home: $220 (reg $275)

   Book now: (312) 266-3399
   ```

2. Login to `/admin`

3. Upload the file (drag & drop)

4. Wait 30 seconds

5. Test: Ask chatbot "Do you have any teeth whitening specials?"

6. Chatbot responds with February promotion! ✅

7. After February: Delete the file to remove outdated promo

---

## ✨ Features

- 🔐 **Secure**: Password-protected admin access
- 📤 **Easy**: Drag-and-drop file upload
- ⚡ **Fast**: 30-60 second processing
- 📊 **Transparent**: Real-time progress updates
- 🗂️ **Organized**: View and manage all uploads
- 🗑️ **Flexible**: Delete outdated content anytime
- 💰 **Affordable**: Virtually free to operate
- 📱 **Mobile-friendly**: Works on phones and tablets

---

**Ready to empower your team with instant chatbot knowledge updates!** 🚀

---

**Last Updated**: 2025-01-11
**Version**: 1.0
**Status**: Production Ready
