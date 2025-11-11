# Shoreline Dental Chicago - Chat Widget Integration

## Quick Start

Add this code snippet just before the closing `</body>` tag on your website:

```html
<script src="https://your-production-domain.com/embed-shoreline.js"></script>
```

---

## Step-by-Step Installation

### Option 1: Direct Embed (Recommended)

1. **Add the script to your website**

   Open your website's HTML file (or template) and add this code just before the closing `</body>` tag:

   ```html
   <!-- Shoreline Dental Chat Widget -->
   <script src="https://your-production-domain.com/embed-shoreline.js"></script>
   ```

2. **That's it!** The chat widget will automatically appear in the bottom-right corner of your website.

### Option 2: With Custom Configuration

If you need to customize the widget, you can provide configuration before loading the script:

```html
<!-- Configure the chat widget -->
<script>
  window.SHORELINE_CHAT_CONFIG = {
    apiBaseUrl: 'https://your-api-domain.com/api/chat',
    position: 'bottom-right', // or 'bottom-left'
    brandName: 'Shoreline Dental Chicago',
    brandColor: '#2C5F8D', // Customize colors if needed
    accentColor: '#4A90A4',
    welcomeMessage: '👋 Welcome! How can we help you today?'
  };
</script>

<!-- Load the chat widget -->
<script src="https://your-production-domain.com/embed-shoreline.js"></script>
```

---

## For WordPress Sites

### Method 1: Using a Plugin (Easiest)

1. Install the "Insert Headers and Footers" plugin
2. Go to Settings → Insert Headers and Footers
3. Paste this code in the "Scripts in Footer" section:

```html
<script src="https://your-production-domain.com/embed-shoreline.js"></script>
```

4. Click "Save"

### Method 2: Editing Theme Files

1. Go to Appearance → Theme File Editor
2. Select `footer.php` from the right sidebar
3. Find the closing `</body>` tag
4. Add this code just before it:

```html
<!-- Shoreline Dental Chat Widget -->
<script src="https://your-production-domain.com/embed-shoreline.js"></script>
```

5. Click "Update File"

---

## For Squarespace Sites

1. Go to Settings → Advanced → Code Injection
2. Paste this code in the "Footer" section:

```html
<script src="https://your-production-domain.com/embed-shoreline.js"></script>
```

3. Click "Save"

---

## For Wix Sites

1. Go to Settings → Custom Code
2. Click "+ Add Custom Code"
3. Paste this code:

```html
<script src="https://your-production-domain.com/embed-shoreline.js"></script>
```

4. Set "Place Code in": Body - end
5. Set "Add Code to Pages": All pages
6. Click "Apply"

---

## Customization Options

You can customize the widget by configuring `SHORELINE_CHAT_CONFIG`:

### Available Options

| Option | Default | Description |
|--------|---------|-------------|
| `apiBaseUrl` | (required) | Your production API endpoint |
| `brandName` | "Shoreline Dental Chicago" | Business name shown in header |
| `brandColor` | "#2C5F8D" | Primary brand color (button, header) |
| `accentColor` | "#4A90A4" | Accent color for hover states |
| `welcomeMessage` | "👋 Welcome to Shoreline Dental Chicago! How can we help you today?" | First message shown to users |
| `position` | "bottom-right" | Widget position: "bottom-right" or "bottom-left" |

### Example with All Options:

```html
<script>
  window.SHORELINE_CHAT_CONFIG = {
    apiBaseUrl: 'https://your-api.vercel.app/api/chat',
    brandName: 'Shoreline Dental Chicago',
    brandColor: '#2C5F8D',
    accentColor: '#4A90A4',
    welcomeMessage: '👋 Hi there! We\'re here to help. What brings you in today?',
    position: 'bottom-right'
  };
</script>
<script src="https://your-production-domain.com/embed-shoreline.js"></script>
```

---

## Testing the Integration

After adding the widget to your website:

1. **Refresh your website** in a browser
2. **Look for the blue chat button** in the bottom-right corner
3. **Click the button** to open the chat window
4. **Send a test message** like "What are your hours?"
5. **Verify you get a response** from the chatbot

---

## Production Deployment Checklist

Before going live, make sure to:

- [ ] **Update API URL**: Replace `https://your-production-domain.com` with your actual production domain
- [ ] **Configure CORS**: Add `https://www.shorelinedentalchicago.com` to your CORS configuration
- [ ] **Test on mobile**: Verify the widget works on mobile devices
- [ ] **Test on different browsers**: Chrome, Firefox, Safari, Edge
- [ ] **Verify email summaries**: Ensure daily summaries are being sent to both recipients
- [ ] **Check analytics**: Monitor chat conversations in Supabase dashboard

---

## Troubleshooting

### Widget doesn't appear

1. Check browser console for errors (F12 → Console tab)
2. Verify the script URL is correct
3. Make sure the script is loaded after the `<body>` tag opens
4. Check if another script is blocking execution

### "Connection error" message

1. Verify the `apiBaseUrl` is correct
2. Check CORS configuration includes your website domain
3. Ensure the API is running and accessible
4. Check browser console for specific error messages

### Messages not being saved

1. Verify Supabase credentials in `.env`
2. Check Supabase database tables exist
3. Review API logs for errors

### Daily email not being sent

1. Verify Resend API key is configured
2. Check both email addresses are in `.env`
3. Verify cron job is set up correctly
4. Check Vercel cron logs

---

## Support

For technical support or questions:

- **Developer**: Review [README.md](./README.md) for API documentation
- **Chat Logs**: Check Supabase dashboard for conversation history
- **Email Issues**: Verify Resend dashboard for email delivery status

---

## What Happens Next

Once the widget is installed:

1. **Visitors can chat** with your AI assistant 24/7
2. **Conversations are saved** to Supabase database
3. **Daily summaries** are emailed to:
   - Anel Leyva <anel@shorelinedentalchicago.com>
   - Mollie Rojas <mollierojas@shorelinedentalchicago.com>
4. **AI uses your knowledge base** from the 376 optimized chunks in Pinecone
5. **Sessions persist** across page reloads for better user experience

---

**Last Updated**: 2025-01-11
**Widget Version**: 1.0.0
**Compatible with**: All modern browsers (Chrome, Firefox, Safari, Edge)
