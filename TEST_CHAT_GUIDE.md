# Test Chat Interface - User Guide

## Overview

The **Test Chat Interface** is an internal staff tool for testing the Shoreline Dental chatbot directly on your Vercel deployment. This allows staff to verify uploaded documents are working and test chatbot responses before content goes live on the main website.

**Access URL**: `https://your-vercel-domain.com/test-chat`

**Purpose**: Internal testing and quality assurance for chatbot knowledge base

---

## 🎯 What Is This For?

### Primary Use Cases:

1. **Test Uploaded Documents**: Verify new documents are indexed correctly
2. **Quality Assurance**: Check chatbot responses for accuracy
3. **Training**: Staff can practice with the chatbot
4. **Content Validation**: Test knowledge base before website deployment
5. **Troubleshooting**: Debug chatbot issues
6. **Demo**: Show chatbot capabilities to team members

### This Is NOT:

- ❌ A customer-facing interface (use website embed for that)
- ❌ A production chat system
- ❌ Meant for patient interactions

---

## 🚀 Quick Start

### Step 1: Access the Test Interface

Navigate to: `https://your-vercel-domain.com/test-chat`

No password required! This is an internal tool for staff testing.

### Step 2: Start Chatting

- Type your message in the input box
- Press **Enter** to send (or click the send button)
- Wait for chatbot response (usually 2-5 seconds)

### Step 3: Use Quick Tests

Click any "Quick Test" button in the sidebar to auto-fill common questions:
- Business Hours
- Teeth Whitening
- Invisalign
- Insurance
- Location
- Emergency Care

---

## 💡 Interface Overview

### Main Chat Area

**Header Bar**:
- Status indicator (green = online, red = error)
- Clear Chat button
- Link to Admin Dashboard

**Messages Area**:
- Your messages appear on the right (purple gradient)
- Chatbot responses on the left (gray background)
- Timestamps for each message
- Auto-scrolls to latest message

**Input Area**:
- Text input (max 500 characters)
- Character counter
- Send button (arrow icon)
- Hint: "Press Enter to send, Shift+Enter for new line"

### Sidebar Sections

**🎯 Quick Tests**:
- Pre-filled test questions
- Click to auto-fill input
- Common customer questions

**📊 Session Info**:
- **Messages Sent**: Count of your messages
- **Session ID**: Unique identifier (first 8 chars shown)
- **Started**: How long ago session began

**💡 Testing Tips**:
- Best practices for testing
- What to look for
- Quality checks

**🔗 Quick Links**:
- Admin Dashboard
- Live Website
- Export Chat Log

---

## 🧪 How to Test Effectively

### Testing Uploaded Documents

**After uploading a new document:**

1. Wait 1-2 minutes for full indexing
2. Open test chat interface
3. Ask specific questions about the content
4. Verify accuracy of responses
5. Check if chatbot cites the information
6. Try different phrasings of the same question

**Example Test Flow**:

```
You uploaded: "teeth-whitening-prices-2025.pdf"

Test questions:
✓ "How much does teeth whitening cost?"
✓ "What's the price for professional whitening?"
✓ "Do you have any teeth whitening specials?"
✓ "Tell me about your whitening services"

Verify:
- Chatbot mentions current prices
- Information matches your PDF
- Response is clear and helpful
- No outdated pricing mentioned
```

### Testing Knowledge Base Accuracy

**Check for:**

- ✅ Correct business hours
- ✅ Accurate pricing
- ✅ Current promotions
- ✅ Service descriptions
- ✅ Contact information
- ✅ Location details
- ✅ Insurance information

**Red flags:**

- ❌ Outdated information
- ❌ Wrong prices
- ❌ Expired promotions
- ❌ Contradictory responses
- ❌ "I don't know" for known information
- ❌ Hallucinated/made-up details

### Testing Edge Cases

**Try unusual questions:**

- Very broad: "Tell me everything about dental services"
- Very specific: "Do you offer laser gum contouring?"
- Ambiguous: "How much does it cost?"
- Off-topic: "What's the weather?"
- Complex: "I need an emergency appointment for my 7-year-old with tooth pain, do you take my insurance?"

**Good responses should:**
- Stay on topic
- Ask clarifying questions when needed
- Provide relevant information
- Direct to contact if appropriate
- Not make up information

---

## 📋 Testing Workflows

### Workflow 1: New Document Verification

**Scenario**: Just uploaded `service-invisalign.pdf`

1. ✅ Upload document via Admin Dashboard
2. ✅ Wait for success confirmation
3. ✅ Open Test Chat Interface
4. ✅ Ask: "Do you offer Invisalign?"
5. ✅ Verify response mentions Invisalign
6. ✅ Ask: "How much does Invisalign cost?"
7. ✅ Check price matches document
8. ✅ Ask: "What's the Invisalign process?"
9. ✅ Verify step-by-step info is accurate
10. ✅ Try variations of questions

**If issues:**
- Check document uploaded successfully in Admin
- Verify Pinecone shows increased vector count
- Wait a bit longer for indexing
- Try more specific questions

### Workflow 2: Promotion Testing

**Scenario**: Adding February promotion

1. ✅ Upload `promo-feb-whitening.txt` via Admin
2. ✅ Open Test Chat
3. ✅ Ask: "Do you have any specials?"
4. ✅ Verify February promotion mentioned
5. ✅ Check dates are correct (Feb 1-28)
6. ✅ Verify pricing is accurate
7. ✅ Test related questions
8. ✅ Export chat log for record

**After promotion expires:**
1. ✅ Delete promotion file from Admin
2. ✅ Test that chatbot no longer mentions it
3. ✅ Verify still mentions regular pricing

### Workflow 3: Comprehensive Knowledge Test

**Scenario**: Quarterly knowledge base audit

1. ✅ Clear chat to start fresh
2. ✅ Test each Quick Test button
3. ✅ Verify all basic information correct
4. ✅ Ask about each service offered
5. ✅ Check pricing for all services
6. ✅ Test insurance questions
7. ✅ Verify contact information
8. ✅ Check emergency procedures
9. ✅ Export chat log
10. ✅ Review for any inconsistencies

---

## 🔧 Features & Shortcuts

### Keyboard Shortcuts

- **Enter**: Send message
- **Shift + Enter**: New line in message
- **Tab**: Quick navigation

### Message Formatting

Messages are plain text only. The chatbot responds with formatted text.

**Tips:**
- Be conversational and natural
- Ask follow-up questions
- Test different phrasings
- Try misspellings (common user errors)

### Session Management

**Each test session has:**
- Unique session ID (for tracking)
- Message counter
- Start time
- Isolated conversation history

**To start fresh:**
- Click "🗑️ Clear Chat" button
- Or refresh the page
- Session ID will regenerate

### Exporting Chat Logs

**Why export:**
- Document testing results
- Share findings with team
- Track issues over time
- Training documentation

**How to export:**

1. Click "📥 Export Chat Log" in sidebar
2. Downloads JSON file with:
   - Session ID
   - All messages with timestamps
   - Message count
   - Export date

**Example filename**: `chat-log-a3b5c7d9-1736678400000.json`

---

## 🎓 Example Testing Scenarios

### Scenario 1: Basic Service Question

**You ask**: "What are your business hours?"

**Good response**:
```
We're open Monday-Friday 8:00 AM to 5:00 PM,
and Saturday 9:00 AM to 2:00 PM. We're closed
on Sundays. Would you like to schedule an
appointment?
```

**Bad response**:
```
I don't have that information.
```
→ **Action**: Check knowledge base, re-upload if needed

### Scenario 2: Pricing Question

**You ask**: "How much does a dental cleaning cost?"

**Good response**:
```
A routine dental cleaning typically costs $120-150
for patients without insurance. If you have dental
insurance, most plans cover cleanings at 100%.
Would you like to know about our new patient specials?
```

**Bad response**:
```
Cleanings cost $50.
```
→ **Action**: Price is wrong! Update knowledge base

### Scenario 3: Complex Question

**You ask**: "I have a cracked tooth and I'm in pain. Can you see me today?"

**Good response**:
```
I'm sorry to hear you're experiencing pain! We do
offer emergency dental care. Please call us directly
at (312) 266-3399 so we can schedule you as soon
as possible today. In the meantime, avoid chewing
on that side and take over-the-counter pain relief
if needed.
```

**Bad response**:
```
Yes, we have appointments available on Thursday.
```
→ **Action**: Not urgent enough! Review emergency protocols

---

## 📊 Interpreting Results

### Signs of Good Performance

✅ **Accurate Information**:
- Prices match current rates
- Hours are correct
- Services accurately described

✅ **Helpful Responses**:
- Answers the actual question
- Provides relevant details
- Offers next steps (call, book, etc.)

✅ **Appropriate Tone**:
- Professional yet friendly
- Empathetic when needed
- Clear and concise

✅ **Proper Boundaries**:
- Doesn't give medical advice
- Refers to staff when appropriate
- Admits when doesn't know something

### Red Flags to Address

❌ **Outdated Information**:
- Old prices mentioned
- Expired promotions
- Wrong business hours

**Fix**: Update knowledge base, delete old documents

❌ **Missing Information**:
- "I don't know" for basic questions
- Can't answer about recent uploads

**Fix**: Verify document uploaded, check Pinecone

❌ **Incorrect Information**:
- Wrong prices
- Inaccurate service descriptions
- Contradicts website

**Fix**: Review source documents, update content

❌ **Confusing Responses**:
- Vague or unclear
- Off-topic
- Too technical

**Fix**: Improve document clarity, add more context

---

## 🛠️ Troubleshooting

### "Connection error" or No Response

**Possible causes:**
- Internet connection issue
- Vercel deployment offline
- API endpoint error

**Solutions:**
- Check internet connection
- Refresh the page
- Check Vercel deployment status
- Verify environment variables configured
- Check API logs in Vercel dashboard

### Chatbot Doesn't Know About Uploaded Document

**Possible causes:**
- Document still processing
- Not enough time for indexing
- Upload failed silently
- Pinecone index issue

**Solutions:**
- Wait 2-3 minutes and try again
- Check Admin Dashboard for successful upload
- Verify document appears in list
- Try re-uploading the document
- Check Pinecone dashboard for vector count

### Responses Are Slow

**Typical response time**: 2-5 seconds

**If slower:**
- Large knowledge base (many vectors to search)
- Cold start (first request after idle)
- OpenRouter API slowdown

**Solutions:**
- Wait patiently (should still complete)
- Check OpenRouter status
- Verify Pinecone query performance

### Session Not Tracking Properly

**Issues:**
- Message count not incrementing
- Session ID not showing

**Solutions:**
- Hard refresh page (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Try different browser
- Check browser console for JavaScript errors (F12)

---

## 💰 Cost Considerations

### Testing Costs

**Each test message costs:**
- OpenRouter chat API: ~$0.0001-0.0002
- Pinecone query: Free (within 100k/month limit)
- Vercel function execution: Free (within limits)

**Heavy testing (100 messages)**: ~$0.01-0.02

**Monthly testing budget**: < $1

→ **Test freely! Costs are negligible.**

### Not Stored in Production Database

Test chat sessions are:
- ✅ Processed by chatbot
- ✅ Use production knowledge base
- ❌ NOT stored in Supabase
- ❌ NOT included in daily email summaries
- ❌ NOT visible to customers

This is a **testing sandbox** - chat freely without affecting production!

---

## 🔐 Access & Security

### Who Can Access?

**Anyone with the URL** can access the test chat interface.

**Best practices:**
- Don't share URL publicly
- Only share with authorized staff
- Not password-protected (internal tool)
- No sensitive data should be entered

### Data Privacy

**Safe to test:**
- ✅ General service questions
- ✅ Pricing inquiries
- ✅ Business information
- ✅ Appointment scenarios

**Don't enter:**
- ❌ Real patient names or information
- ❌ Actual medical data
- ❌ Credit card numbers
- ❌ Social security numbers
- ❌ Personal health information (PHI)

---

## 📚 Related Documentation

- **Admin Dashboard**: [ADMIN_DASHBOARD_README.md](ADMIN_DASHBOARD_README.md)
- **Staff Upload Guide**: [STAFF_UPLOAD_GUIDE.md](STAFF_UPLOAD_GUIDE.md)
- **Deployment Guide**: [QUICK_START_DEPLOYMENT.md](QUICK_START_DEPLOYMENT.md)
- **Email Summaries**: [EMAIL_SUMMARY_ENHANCEMENTS.md](EMAIL_SUMMARY_ENHANCEMENTS.md)

---

## ✅ Testing Checklist

### Weekly Testing (5 minutes)

- [ ] Test each Quick Test button
- [ ] Verify business hours are current
- [ ] Check pricing is accurate
- [ ] Test one recent document upload
- [ ] Confirm contact info correct

### After Document Upload (2 minutes)

- [ ] Wait 2 minutes after upload
- [ ] Ask specific question about content
- [ ] Verify response includes new info
- [ ] Test 2-3 variations of question
- [ ] Note any issues

### Monthly Audit (30 minutes)

- [ ] Test all services mentioned on website
- [ ] Verify all pricing current
- [ ] Check seasonal promotions active/removed
- [ ] Test insurance information
- [ ] Verify emergency procedures
- [ ] Try 10+ edge case questions
- [ ] Export and review chat log
- [ ] Document findings

---

## 🆘 Getting Help

### For Technical Issues:

**Check:**
1. Vercel deployment logs
2. Browser console (F12) for errors
3. Network tab for failed requests
4. Pinecone dashboard for index health

**Contact:** System administrator or developer

### For Content Issues:

**Check:**
1. Source documents in Admin Dashboard
2. Website for source of truth
3. Recent document uploads

**Action:**
- Update knowledge base via Admin
- Delete outdated documents
- Re-upload corrected content

---

## Summary

✅ **Internal Testing Tool**: Staff-only chatbot testing interface
✅ **No Authentication Required**: Open access for internal use
✅ **Production Knowledge Base**: Tests real chatbot with live data
✅ **Quick Testing**: 6 pre-configured test questions
✅ **Session Tracking**: Message count, session ID, timestamps
✅ **Export Capability**: Download chat logs for documentation
✅ **Real-time Testing**: Verify uploads work immediately
✅ **Cost-Effective**: < $1/month for extensive testing
✅ **Isolated Sessions**: Doesn't affect production chat logs

**Use this tool regularly to ensure chatbot quality and accuracy before customer interactions!**

---

**Last Updated**: 2025-01-11
**Access**: `https://your-vercel-domain.com/test-chat`
**Cost**: < $1/month
**Authentication**: None required (internal tool)
