// Test Chat Interface JavaScript

// Configuration
const API_BASE = window.location.origin;
let sessionId = null;
let messageCount = 0;
let sessionStartTime = new Date();
let chatHistory = [];

// DOM Elements
const messagesArea = document.getElementById('messagesArea');
const messageInput = document.getElementById('messageInput');
const chatForm = document.getElementById('chatForm');
const sendBtn = document.getElementById('sendBtn');
const clearBtn = document.getElementById('clearBtn');
const charCount = document.getElementById('charCount');
const statusText = document.getElementById('statusText');
const messageCountEl = document.getElementById('messageCount');
const sessionIdEl = document.getElementById('sessionId');
const sessionStartEl = document.getElementById('sessionStart');
const exportChatBtn = document.getElementById('exportChatBtn');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initializeSession();
  setupEventListeners();
  autoResizeTextarea();
});

// Initialize Session
function initializeSession() {
  // Generate unique session ID
  sessionId = generateSessionId();
  sessionIdEl.textContent = sessionId.substring(0, 8) + '...';

  // Update start time display
  updateSessionTime();
  setInterval(updateSessionTime, 60000); // Update every minute
}

// Setup Event Listeners
function setupEventListeners() {
  // Chat form submission
  chatForm.addEventListener('submit', handleSubmit);

  // Character counter
  messageInput.addEventListener('input', () => {
    const length = messageInput.value.length;
    charCount.textContent = `${length}/500`;

    // Auto-resize textarea
    autoResizeTextarea();
  });

  // Enter key handling
  messageInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      chatForm.dispatchEvent(new Event('submit'));
    }
  });

  // Clear chat button
  clearBtn.addEventListener('click', handleClearChat);

  // Quick test buttons
  document.querySelectorAll('.quick-test-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const message = btn.getAttribute('data-message');
      messageInput.value = message;
      autoResizeTextarea();
      messageInput.focus();
    });
  });

  // Export chat button
  exportChatBtn.addEventListener('click', handleExportChat);
}

// Handle Form Submission
async function handleSubmit(e) {
  e.preventDefault();

  const message = messageInput.value.trim();
  if (!message) return;

  // Disable input while processing
  setInputState(false);

  // Add user message to chat
  addMessage('user', message);

  // Clear input
  messageInput.value = '';
  charCount.textContent = '0/500';
  autoResizeTextarea();

  // Increment message count
  messageCount++;
  messageCountEl.textContent = messageCount;

  // Show typing indicator
  const typingId = showTypingIndicator();

  try {
    // Send message to API
    const response = await fetch(`${API_BASE}/api/chat/webhook`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: message,
        sessionId: sessionId,
      }),
    });

    // Remove typing indicator
    removeTypingIndicator(typingId);

    if (!response.ok) {
      throw new Error('Failed to get response');
    }

    const data = await response.json();

    // Add assistant response
    if (data.response) {
      addMessage('assistant', data.response);
    } else {
      throw new Error('No response from chatbot');
    }

    // Update status
    setStatus('online', 'Online');

  } catch (error) {
    console.error('Error sending message:', error);

    // Remove typing indicator
    removeTypingIndicator(typingId);

    // Show error message
    addMessage('assistant', '⚠️ Sorry, I encountered an error. Please try again or check the connection.');

    // Update status
    setStatus('offline', 'Error');

    // Auto-recover status after 3 seconds
    setTimeout(() => {
      setStatus('online', 'Online');
    }, 3000);
  } finally {
    // Re-enable input
    setInputState(true);
    messageInput.focus();
  }
}

// Add Message to Chat
function addMessage(role, content) {
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const avatar = role === 'user' ? '👤' : '🤖';
  const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  messageDiv.innerHTML = `
    <div class="message-avatar">${avatar}</div>
    <div class="message-content">
      <div class="message-bubble">${formatMessageContent(content)}</div>
      <div class="message-time">${time}</div>
    </div>
  `;

  messagesArea.appendChild(messageDiv);
  scrollToBottom();

  // Store in chat history
  chatHistory.push({
    role: role,
    content: content,
    timestamp: new Date().toISOString(),
  });
}

// Show Typing Indicator
function showTypingIndicator() {
  const typingId = 'typing-' + Date.now();
  const typingDiv = document.createElement('div');
  typingDiv.id = typingId;
  typingDiv.className = 'message assistant';

  typingDiv.innerHTML = `
    <div class="message-avatar">🤖</div>
    <div class="message-content">
      <div class="message-bubble">
        <div class="typing-indicator">
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
          <div class="typing-dot"></div>
        </div>
      </div>
    </div>
  `;

  messagesArea.appendChild(typingDiv);
  scrollToBottom();

  return typingId;
}

// Remove Typing Indicator
function removeTypingIndicator(typingId) {
  const typingDiv = document.getElementById(typingId);
  if (typingDiv) {
    typingDiv.remove();
  }
}

// Clear Chat
function handleClearChat() {
  if (confirm('Are you sure you want to clear the chat? This will reset the conversation.')) {
    // Keep only the welcome message
    const welcomeMessage = messagesArea.querySelector('.message.assistant');
    messagesArea.innerHTML = '';
    if (welcomeMessage) {
      messagesArea.appendChild(welcomeMessage);
    }

    // Reset counters and history
    messageCount = 0;
    messageCountEl.textContent = '0';
    chatHistory = [];

    // Generate new session
    sessionId = generateSessionId();
    sessionIdEl.textContent = sessionId.substring(0, 8) + '...';
    sessionStartTime = new Date();
    updateSessionTime();
  }
}

// Export Chat
function handleExportChat() {
  if (chatHistory.length === 0) {
    alert('No messages to export. Start a conversation first!');
    return;
  }

  const exportData = {
    sessionId: sessionId,
    sessionStart: sessionStartTime.toISOString(),
    messageCount: messageCount,
    messages: chatHistory,
    exportedAt: new Date().toISOString(),
  };

  const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `chat-log-${sessionId.substring(0, 8)}-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  // Show confirmation
  const originalText = exportChatBtn.textContent;
  exportChatBtn.textContent = '✅ Exported!';
  setTimeout(() => {
    exportChatBtn.textContent = originalText;
  }, 2000);
}

// Set Input State
function setInputState(enabled) {
  messageInput.disabled = !enabled;
  sendBtn.disabled = !enabled;

  if (enabled) {
    messageInput.focus();
  }
}

// Set Status
function setStatus(status, text) {
  const indicator = document.querySelector('.status-indicator');
  indicator.className = `status-indicator ${status}`;
  statusText.textContent = text;
}

// Update Session Time
function updateSessionTime() {
  const elapsed = Date.now() - sessionStartTime.getTime();
  const minutes = Math.floor(elapsed / 60000);

  if (minutes < 1) {
    sessionStartEl.textContent = 'Just now';
  } else if (minutes < 60) {
    sessionStartEl.textContent = `${minutes} min ago`;
  } else {
    const hours = Math.floor(minutes / 60);
    sessionStartEl.textContent = `${hours}h ${minutes % 60}m ago`;
  }
}

// Auto-resize Textarea
function autoResizeTextarea() {
  messageInput.style.height = 'auto';
  messageInput.style.height = Math.min(messageInput.scrollHeight, 120) + 'px';
}

// Scroll to Bottom
function scrollToBottom() {
  messagesArea.scrollTop = messagesArea.scrollHeight;
}

// Generate Session ID
function generateSessionId() {
  return 'test-' + Date.now() + '-' + Math.random().toString(36).substring(2, 9);
}

// Format message content with clickable links and proper formatting
function formatMessageContent(text) {
  // First, escape HTML to prevent XSS
  const div = document.createElement('div');
  div.textContent = text;
  let formatted = div.innerHTML;

  // Convert markdown-style links: [text](url) -> clickable links
  formatted = formatted.replace(
    /\[([^\]]+)\]\(([^)]+)\)/g,
    '<a href="$2" target="_blank" rel="noopener noreferrer" class="chat-link">$1</a>'
  );

  // Convert plain URLs to clickable links (http, https, www)
  formatted = formatted.replace(
    /(?:^|[^"'\w])((?:https?:\/\/|www\.)[^\s<]+[^\s<.,;:!?'")\]])/gi,
    (match, url, offset, string) => {
      // Check if this URL is already part of a link tag
      const before = string.substring(0, offset);
      if (before.match(/<a[^>]*$/) || before.match(/href=["'][^"']*$/)) {
        return match;
      }
      // Ensure URL has protocol
      const href = url.startsWith('www.') ? 'https://' + url : url;
      // Preserve the character before the URL (space, etc.)
      const prefix = match.substring(0, match.indexOf(url));
      return prefix + `<a href="${href}" target="_blank" rel="noopener noreferrer" class="chat-link">${url}</a>`;
    }
  );

  // Convert email addresses to mailto links with icon
  formatted = formatted.replace(
    /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g,
    '<a href="mailto:$1" class="chat-link email-link"><span class="link-icon">✉️</span>$1</a>'
  );

  // Convert phone numbers to tel links with icon (US format)
  formatted = formatted.replace(
    /(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/g,
    '<a href="tel:$1" class="chat-link phone-link"><span class="link-icon">📞</span>$1</a>'
  );

  // Format full addresses beautifully (must have street type like Avenue, Street, etc.)
  // This regex requires a street type word to avoid matching times like "7:00 AM"
  formatted = formatted.replace(
    /(\d+\s+(?:North|South|East|West|N\.?|S\.?|E\.?|W\.?)?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s+(?:Avenue|Ave\.?|Street|St\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Court|Ct\.?|Circle|Cir\.?|Place|Pl\.?)(?:\s*,?\s*(?:Suite|Ste\.?|Unit|Apt\.?|#)\s*[\w\d-]+)?(?:\s*,?\s*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)?(?:\s*,?\s*[A-Z]{2}\s+\d{5}(?:-\d{4})?)?)/gi,
    '<span class="address-block"><span class="address-icon">📍</span><span class="address-text">$1</span></span>'
  );

  // Convert **bold** to <strong>
  formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

  // Convert *italic* to <em>
  formatted = formatted.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Convert line breaks to <br>
  formatted = formatted.replace(/\n/g, '<br>');

  return formatted;
}

// Initial focus
messageInput.focus();
