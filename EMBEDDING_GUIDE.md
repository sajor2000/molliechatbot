# Chat Widget Embedding Guide

This guide shows you how to embed the Shoreline Dental AI chat widget into any website or web application.

---

## 🚀 Quick Start (Plain HTML)

Add this code snippet anywhere in your HTML file, preferably just before the closing `</body>` tag:

```html
<!-- Shoreline Dental Chat Widget -->
<div id="shoreline-chat-widget"></div>
<script>
  (function() {
    const config = {
      apiUrl: 'https://your-app.vercel.app/api/chat/webhook',
      position: 'bottom-right', // Options: 'bottom-right', 'bottom-left'
      primaryColor: '#0066cc',
      greeting: 'Hi! How can we help you today?',
      placeholder: 'Type your message...',
      title: 'Chat with Shoreline Dental'
    };

    // Create widget container
    const widget = document.createElement('div');
    widget.id = 'chat-widget-container';
    widget.style.cssText = `
      position: fixed;
      ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      width: 380px;
      height: 600px;
      max-height: 80vh;
      border-radius: 12px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.15);
      background: white;
      display: flex;
      flex-direction: column;
      z-index: 9999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      transition: transform 0.3s ease;
    `;

    // Create widget header
    const header = document.createElement('div');
    header.style.cssText = `
      background: ${config.primaryColor};
      color: white;
      padding: 16px;
      border-radius: 12px 12px 0 0;
      font-weight: 600;
      font-size: 16px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    header.innerHTML = `
      <span>${config.title}</span>
      <button id="close-chat" style="background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 0; width: 24px; height: 24px; line-height: 1;">&times;</button>
    `;

    // Create messages container
    const messagesContainer = document.createElement('div');
    messagesContainer.id = 'chat-messages';
    messagesContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 12px;
      background: #f9fafb;
    `;

    // Add greeting message
    messagesContainer.innerHTML = `
      <div style="background: #e5e7eb; padding: 12px; border-radius: 12px 12px 12px 4px; max-width: 80%; align-self: flex-start;">
        ${config.greeting}
      </div>
    `;

    // Create input container
    const inputContainer = document.createElement('div');
    inputContainer.style.cssText = `
      padding: 16px;
      border-top: 1px solid #e5e7eb;
      display: flex;
      gap: 8px;
    `;

    const input = document.createElement('input');
    input.type = 'text';
    input.placeholder = config.placeholder;
    input.style.cssText = `
      flex: 1;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    `;
    input.addEventListener('focus', () => {
      input.style.borderColor = config.primaryColor;
    });
    input.addEventListener('blur', () => {
      input.style.borderColor = '#e5e7eb';
    });

    const sendButton = document.createElement('button');
    sendButton.textContent = 'Send';
    sendButton.style.cssText = `
      background: ${config.primaryColor};
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      font-size: 14px;
      transition: opacity 0.2s;
    `;
    sendButton.addEventListener('mouseover', () => {
      sendButton.style.opacity = '0.9';
    });
    sendButton.addEventListener('mouseout', () => {
      sendButton.style.opacity = '1';
    });

    // Create chat button (minimized state)
    const chatButton = document.createElement('button');
    chatButton.id = 'chat-button';
    chatButton.style.cssText = `
      position: fixed;
      ${config.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: ${config.primaryColor};
      color: white;
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      font-size: 24px;
      z-index: 9999;
      transition: transform 0.2s;
    `;
    chatButton.innerHTML = '💬';
    chatButton.addEventListener('mouseover', () => {
      chatButton.style.transform = 'scale(1.1)';
    });
    chatButton.addEventListener('mouseout', () => {
      chatButton.style.transform = 'scale(1)';
    });

    // Assemble widget
    inputContainer.appendChild(input);
    inputContainer.appendChild(sendButton);
    widget.appendChild(header);
    widget.appendChild(messagesContainer);
    widget.appendChild(inputContainer);

    // Initially hidden
    widget.style.display = 'none';

    // Toggle widget visibility
    chatButton.addEventListener('click', () => {
      widget.style.display = 'flex';
      chatButton.style.display = 'none';
      input.focus();
    });

    header.querySelector('#close-chat').addEventListener('click', () => {
      widget.style.display = 'none';
      chatButton.style.display = 'block';
    });

    // Generate session ID
    const sessionId = 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);

    // Send message function
    async function sendMessage() {
      const message = input.value.trim();
      if (!message) return;

      // Add user message to UI
      const userMsg = document.createElement('div');
      userMsg.style.cssText = `
        background: ${config.primaryColor};
        color: white;
        padding: 12px;
        border-radius: 12px 12px 4px 12px;
        max-width: 80%;
        align-self: flex-end;
        word-wrap: break-word;
      `;
      userMsg.textContent = message;
      messagesContainer.appendChild(userMsg);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      input.value = '';
      input.disabled = true;
      sendButton.disabled = true;

      // Show typing indicator
      const typingIndicator = document.createElement('div');
      typingIndicator.style.cssText = `
        background: #e5e7eb;
        padding: 12px;
        border-radius: 12px 12px 12px 4px;
        max-width: 80px;
        align-self: flex-start;
      `;
      typingIndicator.innerHTML = '<span style="animation: blink 1.4s infinite;">●●●</span>';
      messagesContainer.appendChild(typingIndicator);
      messagesContainer.scrollTop = messagesContainer.scrollHeight;

      try {
        // Send to API
        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: message,
            sessionId: sessionId,
            metadata: {
              url: window.location.href,
              referrer: document.referrer,
              userAgent: navigator.userAgent
            }
          })
        });

        const data = await response.json();

        // Remove typing indicator
        messagesContainer.removeChild(typingIndicator);

        // Add bot response
        const botMsg = document.createElement('div');
        botMsg.style.cssText = `
          background: #e5e7eb;
          padding: 12px;
          border-radius: 12px 12px 12px 4px;
          max-width: 80%;
          align-self: flex-start;
          word-wrap: break-word;
        `;
        botMsg.textContent = data.reply || 'Sorry, I couldn\'t process that request.';
        messagesContainer.appendChild(botMsg);
        messagesContainer.scrollTop = messagesContainer.scrollHeight;

      } catch (error) {
        console.error('Chat error:', error);
        messagesContainer.removeChild(typingIndicator);

        const errorMsg = document.createElement('div');
        errorMsg.style.cssText = `
          background: #fee;
          color: #c33;
          padding: 12px;
          border-radius: 12px 12px 12px 4px;
          max-width: 80%;
          align-self: flex-start;
        `;
        errorMsg.textContent = 'Sorry, there was an error. Please try again.';
        messagesContainer.appendChild(errorMsg);
      } finally {
        input.disabled = false;
        sendButton.disabled = false;
        input.focus();
      }
    }

    // Send on button click
    sendButton.addEventListener('click', sendMessage);

    // Send on Enter key
    input.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });

    // Add to page
    document.body.appendChild(widget);
    document.body.appendChild(chatButton);

    // Add blink animation for typing indicator
    const style = document.createElement('style');
    style.textContent = `
      @keyframes blink {
        0%, 20% { opacity: 1; }
        50% { opacity: 0.3; }
        100% { opacity: 1; }
      }
    `;
    document.head.appendChild(style);
  })();
</script>
```

**Important**: Replace `https://your-app.vercel.app` with your actual Vercel deployment URL.

---

## ⚛️ React Integration

For React applications, create a `ChatWidget.tsx` component:

```typescript
import React, { useState, useEffect, useRef } from 'react';

interface ChatWidgetProps {
  apiUrl: string;
  position?: 'bottom-right' | 'bottom-left';
  primaryColor?: string;
  greeting?: string;
  title?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({
  apiUrl,
  position = 'bottom-right',
  primaryColor = '#0066cc',
  greeting = 'Hi! How can we help you today?',
  title = 'Chat with Shoreline Dental'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: greeting, timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId] = useState(() =>
    `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          sessionId,
          metadata: {
            url: window.location.href,
            referrer: document.referrer,
            userAgent: navigator.userAgent
          }
        })
      });

      const data = await response.json();

      const assistantMessage: Message = {
        role: 'assistant',
        content: data.reply || 'Sorry, I couldn\'t process that request.',
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Sorry, there was an error. Please try again.',
        timestamp: new Date()
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          [position.includes('right') ? 'right' : 'left']: '20px',
          bottom: '20px',
          width: '60px',
          height: '60px',
          borderRadius: '50%',
          background: primaryColor,
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          fontSize: '24px',
          zIndex: 9999
        }}
      >
        💬
      </button>
    );
  }

  return (
    <div
      style={{
        position: 'fixed',
        [position.includes('right') ? 'right' : 'left']: '20px',
        bottom: '20px',
        width: '380px',
        height: '600px',
        maxHeight: '80vh',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      {/* Header */}
      <div
        style={{
          background: primaryColor,
          color: 'white',
          padding: '16px',
          borderRadius: '12px 12px 0 0',
          fontWeight: 600,
          fontSize: '16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <span>{title}</span>
        <button
          onClick={() => setIsOpen(false)}
          style={{
            background: 'none',
            border: 'none',
            color: 'white',
            fontSize: '24px',
            cursor: 'pointer',
            padding: 0
          }}
        >
          ×
        </button>
      </div>

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          background: '#f9fafb'
        }}
      >
        {messages.map((msg, idx) => (
          <div
            key={idx}
            style={{
              background: msg.role === 'user' ? primaryColor : '#e5e7eb',
              color: msg.role === 'user' ? 'white' : 'black',
              padding: '12px',
              borderRadius: msg.role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
              maxWidth: '80%',
              alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
              wordWrap: 'break-word'
            }}
          >
            {msg.content}
          </div>
        ))}
        {isLoading && (
          <div
            style={{
              background: '#e5e7eb',
              padding: '12px',
              borderRadius: '12px 12px 12px 4px',
              maxWidth: '80px',
              alignSelf: 'flex-start'
            }}
          >
            ●●●
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div
        style={{
          padding: '16px',
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '8px'
        }}
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
          placeholder="Type your message..."
          disabled={isLoading}
          style={{
            flex: 1,
            padding: '12px',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            fontSize: '14px',
            outline: 'none'
          }}
        />
        <button
          onClick={sendMessage}
          disabled={isLoading || !input.trim()}
          style={{
            background: primaryColor,
            color: 'white',
            border: 'none',
            padding: '12px 24px',
            borderRadius: '8px',
            cursor: 'pointer',
            fontWeight: 600,
            fontSize: '14px',
            opacity: (isLoading || !input.trim()) ? 0.5 : 1
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};
```

**Usage in your React app:**

```typescript
import { ChatWidget } from './components/ChatWidget';

function App() {
  return (
    <div>
      {/* Your app content */}
      <ChatWidget
        apiUrl="https://your-app.vercel.app/api/chat/webhook"
        position="bottom-right"
        primaryColor="#0066cc"
        greeting="Hi! How can we help you today?"
        title="Chat with Shoreline Dental"
      />
    </div>
  );
}
```

---

## 🎨 Vue.js Integration

Create a `ChatWidget.vue` component:

```vue
<template>
  <div>
    <!-- Minimized button -->
    <button
      v-if="!isOpen"
      @click="isOpen = true"
      :style="buttonStyle"
    >
      💬
    </button>

    <!-- Chat widget -->
    <div v-else :style="widgetStyle">
      <!-- Header -->
      <div :style="headerStyle">
        <span>{{ title }}</span>
        <button @click="isOpen = false" :style="closeButtonStyle">×</button>
      </div>

      <!-- Messages -->
      <div :style="messagesStyle" ref="messagesContainer">
        <div
          v-for="(msg, idx) in messages"
          :key="idx"
          :style="getMessageStyle(msg.role)"
        >
          {{ msg.content }}
        </div>
        <div v-if="isLoading" :style="typingStyle">●●●</div>
      </div>

      <!-- Input -->
      <div :style="inputContainerStyle">
        <input
          v-model="input"
          @keypress.enter="sendMessage"
          :disabled="isLoading"
          placeholder="Type your message..."
          :style="inputStyle"
        />
        <button
          @click="sendMessage"
          :disabled="isLoading || !input.trim()"
          :style="sendButtonStyle"
        >
          Send
        </button>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'ChatWidget',
  props: {
    apiUrl: {
      type: String,
      required: true
    },
    position: {
      type: String,
      default: 'bottom-right'
    },
    primaryColor: {
      type: String,
      default: '#0066cc'
    },
    greeting: {
      type: String,
      default: 'Hi! How can we help you today?'
    },
    title: {
      type: String,
      default: 'Chat with Shoreline Dental'
    }
  },
  data() {
    return {
      isOpen: false,
      messages: [
        { role: 'assistant', content: this.greeting, timestamp: new Date() }
      ],
      input: '',
      isLoading: false,
      sessionId: `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
    };
  },
  computed: {
    buttonStyle() {
      return {
        position: 'fixed',
        [this.position.includes('right') ? 'right' : 'left']: '20px',
        bottom: '20px',
        width: '60px',
        height: '60px',
        borderRadius: '50%',
        background: this.primaryColor,
        color: 'white',
        border: 'none',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        fontSize: '24px',
        zIndex: 9999
      };
    },
    widgetStyle() {
      return {
        position: 'fixed',
        [this.position.includes('right') ? 'right' : 'left']: '20px',
        bottom: '20px',
        width: '380px',
        height: '600px',
        maxHeight: '80vh',
        borderRadius: '12px',
        boxShadow: '0 4px 24px rgba(0,0,0,0.15)',
        background: 'white',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 9999,
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      };
    },
    headerStyle() {
      return {
        background: this.primaryColor,
        color: 'white',
        padding: '16px',
        borderRadius: '12px 12px 0 0',
        fontWeight: 600,
        fontSize: '16px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      };
    },
    messagesStyle() {
      return {
        flex: 1,
        overflowY: 'auto',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        background: '#f9fafb'
      };
    },
    inputContainerStyle() {
      return {
        padding: '16px',
        borderTop: '1px solid #e5e7eb',
        display: 'flex',
        gap: '8px'
      };
    },
    inputStyle() {
      return {
        flex: 1,
        padding: '12px',
        border: '1px solid #e5e7eb',
        borderRadius: '8px',
        fontSize: '14px',
        outline: 'none'
      };
    },
    sendButtonStyle() {
      return {
        background: this.primaryColor,
        color: 'white',
        border: 'none',
        padding: '12px 24px',
        borderRadius: '8px',
        cursor: 'pointer',
        fontWeight: 600,
        fontSize: '14px',
        opacity: (this.isLoading || !this.input.trim()) ? 0.5 : 1
      };
    },
    closeButtonStyle() {
      return {
        background: 'none',
        border: 'none',
        color: 'white',
        fontSize: '24px',
        cursor: 'pointer',
        padding: 0
      };
    },
    typingStyle() {
      return {
        background: '#e5e7eb',
        padding: '12px',
        borderRadius: '12px 12px 12px 4px',
        maxWidth: '80px',
        alignSelf: 'flex-start'
      };
    }
  },
  methods: {
    getMessageStyle(role) {
      return {
        background: role === 'user' ? this.primaryColor : '#e5e7eb',
        color: role === 'user' ? 'white' : 'black',
        padding: '12px',
        borderRadius: role === 'user' ? '12px 12px 4px 12px' : '12px 12px 12px 4px',
        maxWidth: '80%',
        alignSelf: role === 'user' ? 'flex-end' : 'flex-start',
        wordWrap: 'break-word'
      };
    },
    async sendMessage() {
      if (!this.input.trim() || this.isLoading) return;

      this.messages.push({
        role: 'user',
        content: this.input,
        timestamp: new Date()
      });

      const message = this.input;
      this.input = '';
      this.isLoading = true;

      try {
        const response = await fetch(this.apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            sessionId: this.sessionId,
            metadata: {
              url: window.location.href,
              referrer: document.referrer,
              userAgent: navigator.userAgent
            }
          })
        });

        const data = await response.json();

        this.messages.push({
          role: 'assistant',
          content: data.reply || 'Sorry, I couldn\'t process that request.',
          timestamp: new Date()
        });
      } catch (error) {
        console.error('Chat error:', error);
        this.messages.push({
          role: 'assistant',
          content: 'Sorry, there was an error. Please try again.',
          timestamp: new Date()
        });
      } finally {
        this.isLoading = false;
        this.$nextTick(() => {
          const container = this.$refs.messagesContainer;
          container.scrollTop = container.scrollHeight;
        });
      }
    }
  }
};
</script>
```

**Usage:**

```vue
<template>
  <div id="app">
    <!-- Your app content -->
    <ChatWidget
      api-url="https://your-app.vercel.app/api/chat/webhook"
      position="bottom-right"
      primary-color="#0066cc"
      greeting="Hi! How can we help you today?"
      title="Chat with Shoreline Dental"
    />
  </div>
</template>

<script>
import ChatWidget from './components/ChatWidget.vue';

export default {
  components: {
    ChatWidget
  }
};
</script>
```

---

## 📝 WordPress Integration

Add this code to your theme's `footer.php` or use a plugin like "Insert Headers and Footers":

```php
<!-- Shoreline Dental Chat Widget -->
<script>
  window.shorelineChatConfig = {
    apiUrl: 'https://your-app.vercel.app/api/chat/webhook',
    position: 'bottom-right',
    primaryColor: '#0066cc',
    greeting: 'Hi! How can we help you today?',
    title: 'Chat with Shoreline Dental'
  };
</script>
<script src="https://your-app.vercel.app/widget.js" async></script>
```

---

## 🎨 Customization Options

### Configuration Object

```javascript
const config = {
  // Required
  apiUrl: 'https://your-app.vercel.app/api/chat/webhook',

  // Optional
  position: 'bottom-right',        // 'bottom-right' | 'bottom-left'
  primaryColor: '#0066cc',         // Any hex color
  greeting: 'Hi! How can we help?', // Initial bot message
  placeholder: 'Type here...',     // Input placeholder text
  title: 'Chat Support',           // Header title

  // Advanced
  autoOpen: false,                 // Auto-open on page load
  autoOpenDelay: 3000,            // Delay before auto-open (ms)
  showTimestamp: false,           // Show message timestamps
  enableSoundNotification: false  // Play sound on new message
};
```

### Styling Examples

**Match your brand colors:**
```javascript
primaryColor: '#ff6b35'  // Orange theme
primaryColor: '#00b4d8'  // Blue theme
primaryColor: '#06d6a0'  // Green theme
```

**Position on left side:**
```javascript
position: 'bottom-left'
```

**Auto-open after 5 seconds:**
```javascript
autoOpen: true,
autoOpenDelay: 5000
```

---

## 🐛 Troubleshooting

### Widget Not Appearing

1. **Check API URL**: Ensure your Vercel deployment URL is correct
2. **Check Console**: Open browser DevTools → Console tab for errors
3. **CORS Issues**: Verify your API allows requests from your domain
4. **Z-index conflicts**: Widget uses z-index: 9999 - ensure nothing blocks it

### Messages Not Sending

1. **Network tab**: Check if POST request reaches your API
2. **API response**: Verify API returns `{ reply: "..." }` format
3. **Session ID**: Check if sessionId is being generated correctly

### Styling Issues

1. **CSS conflicts**: Widget uses inline styles to avoid conflicts
2. **Mobile responsive**: Widget has `max-height: 80vh` for mobile screens
3. **Font rendering**: Uses system fonts for fastest loading

### Session Not Persisting

Sessions are stored in memory (by session ID). If using multiple domains, sessions are isolated per domain. For cross-domain persistence, implement Redis/Vercel KV.

---

## 📱 Mobile Responsive Design

The widget is automatically mobile-responsive:

- **Desktop**: 380px width × 600px height
- **Mobile**: Full width with max-height: 80vh
- **Touch-friendly**: All buttons have adequate tap targets (44px minimum)

To customize mobile behavior:

```javascript
// Detect mobile and adjust
if (window.innerWidth < 768) {
  config.position = 'bottom-right';
  // Widget will auto-adjust to screen size
}
```

---

## 🔒 Security Best Practices

1. **HTTPS Only**: Always use HTTPS for your API URL
2. **Rate Limiting**: Implement rate limiting in your API (already included in webhook.ts)
3. **Input Sanitization**: API automatically sanitizes inputs
4. **CORS Configuration**: Configure allowed origins in Vercel settings
5. **No Sensitive Data**: Never send passwords or SSNs through the chat

---

## 🚀 Advanced: Custom Widget Hosting

If you want to host the widget JavaScript separately:

1. Create `public/widget.js` in your project
2. Copy the entire JavaScript code from "Quick Start" section
3. Modify it to use `window.shorelineChatConfig` instead of inline config
4. Deploy to Vercel (automatically serves `public/` folder)
5. Include on any site: `<script src="https://your-app.vercel.app/widget.js"></script>`

---

## 📊 Analytics Integration

Track widget interactions with Google Analytics:

```javascript
// Add after sendMessage() success
if (window.gtag) {
  gtag('event', 'chat_message_sent', {
    'event_category': 'Chat Widget',
    'event_label': sessionId
  });
}
```

---

## 💡 Examples by Platform

### Wix
1. Go to Settings → Custom Code
2. Add code to "Body - End" section
3. Paste the Quick Start HTML snippet

### Squarespace
1. Go to Settings → Advanced → Code Injection
2. Paste in "Footer" section
3. Save and refresh

### Shopify
1. Go to Online Store → Themes → Edit Code
2. Open `theme.liquid`
3. Paste before `</body>` tag

### Webflow
1. Go to Project Settings → Custom Code
2. Paste in "Footer Code" section
3. Publish site

---

## ✅ Testing Checklist

Before going live, test:

- [ ] Widget opens and closes correctly
- [ ] Messages send and receive responses
- [ ] Widget works on mobile devices
- [ ] Widget doesn't block important page content
- [ ] Colors match your brand
- [ ] No console errors
- [ ] Session ends properly when page closes
- [ ] Works across different browsers (Chrome, Firefox, Safari, Edge)

---

## 📞 Support

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review browser console for error messages
3. Verify your Vercel API is deployed correctly
4. Check your environment variables are set

---

**Next Steps:**
- Deploy your Vercel app: `vercel --prod`
- Test the widget on a local HTML file first
- Gradually roll out to production website
- Monitor conversations via daily email summaries

---

**Remember**: Replace `https://your-app.vercel.app` with your actual Vercel deployment URL in all examples!
