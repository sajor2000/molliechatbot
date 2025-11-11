/**
 * Shoreline Dental Chicago - Chat Widget Embed Script
 *
 * Usage: Add this script tag to your website:
 * <script src="https://your-production-domain.com/embed.js"></script>
 *
 * Or with custom configuration:
 * <script>
 *   window.SHORELINE_CHAT_CONFIG = {
 *     apiBaseUrl: 'https://your-api-domain.com/api/chat'
 *   };
 * </script>
 * <script src="https://your-production-domain.com/embed.js"></script>
 */

(function() {
  'use strict';

  // Configuration - can be overridden via window.SHORELINE_CHAT_CONFIG
  const CONFIG = Object.assign({
    apiBaseUrl: 'https://your-production-domain.com/api/chat', // UPDATE THIS IN PRODUCTION
    brandName: 'Shoreline Dental Chicago',
    brandColor: '#2C5F8D', // Professional dental blue
    accentColor: '#4A90A4', // Lighter blue for hover states
    welcomeMessage: '👋 Welcome to Shoreline Dental Chicago! How can we help you today?',
    position: 'bottom-right', // 'bottom-right' or 'bottom-left'
  }, window.SHORELINE_CHAT_CONFIG || {});

  // Create widget styles
  const styles = `
    #shoreline-chat-widget * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    #shoreline-chat-widget {
      position: fixed;
      ${CONFIG.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      z-index: 999999;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    #shoreline-chat-button {
      width: 64px;
      height: 64px;
      border-radius: 50%;
      background: ${CONFIG.brandColor};
      border: none;
      cursor: pointer;
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.3s ease;
      position: relative;
    }

    #shoreline-chat-button:hover {
      transform: scale(1.1);
      box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
    }

    #shoreline-chat-button .pulse {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      background: ${CONFIG.brandColor};
      opacity: 0.6;
      animation: shorelinePulse 2s infinite;
    }

    @keyframes shorelinePulse {
      0% { transform: scale(1); opacity: 0.6; }
      50% { transform: scale(1.1); opacity: 0.3; }
      100% { transform: scale(1); opacity: 0.6; }
    }

    #mollieweb-chat-button svg {
      width: 28px;
      height: 28px;
      fill: white;
    }

    #mollieweb-chat-window {
      position: fixed;
      bottom: 100px;
      right: 20px;
      width: 380px;
      height: 550px;
      background: white;
      border-radius: 16px;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
      display: none;
      flex-direction: column;
      overflow: hidden;
    }

    #mollieweb-chat-window.active {
      display: flex;
    }

    .mollieweb-chat-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }

    .mollieweb-chat-header h3 {
      margin: 0;
      font-size: 18px;
    }

    .mollieweb-chat-header button {
      background: none;
      border: none;
      color: white;
      cursor: pointer;
      font-size: 24px;
      line-height: 1;
    }

    .mollieweb-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f9fafb;
    }

    .mollieweb-message {
      margin-bottom: 16px;
      animation: molliewebFadeIn 0.3s;
    }

    @keyframes molliewebFadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .mollieweb-message-content {
      padding: 12px 16px;
      border-radius: 12px;
      max-width: 80%;
      word-wrap: break-word;
    }

    .mollieweb-message.user {
      text-align: right;
    }

    .mollieweb-message.user .mollieweb-message-content {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      margin-left: auto;
    }

    .mollieweb-message.assistant .mollieweb-message-content {
      background: white;
      color: #1f2937;
      border: 1px solid #e5e7eb;
    }

    .mollieweb-message-time {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 4px;
    }

    .mollieweb-typing-indicator {
      display: none;
      padding: 12px 16px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 12px;
      width: fit-content;
    }

    .mollieweb-typing-indicator.active {
      display: block;
    }

    .mollieweb-typing-indicator span {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #9ca3af;
      margin: 0 2px;
      animation: molliewebTyping 1.4s infinite;
    }

    .mollieweb-typing-indicator span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .mollieweb-typing-indicator span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes molliewebTyping {
      0%, 60%, 100% { transform: translateY(0); }
      30% { transform: translateY(-10px); }
    }

    .mollieweb-chat-input-container {
      padding: 16px;
      background: white;
      border-top: 1px solid #e5e7eb;
    }

    .mollieweb-chat-input-wrapper {
      display: flex;
      gap: 8px;
    }

    #mollieweb-chat-input {
      flex: 1;
      padding: 12px;
      border: 1px solid #e5e7eb;
      border-radius: 8px;
      font-size: 14px;
      outline: none;
    }

    #mollieweb-chat-input:focus {
      border-color: #667eea;
    }

    #mollieweb-send-button {
      padding: 12px 20px;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: opacity 0.2s;
    }

    #mollieweb-send-button:hover {
      opacity: 0.9;
    }

    #mollieweb-send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }

    @media (max-width: 480px) {
      #mollieweb-chat-window {
        width: calc(100vw - 40px);
        height: calc(100vh - 140px);
        bottom: 100px;
        right: 20px;
      }
    }
  `;

  // Create widget HTML
  const widgetHTML = `
    <div id="mollieweb-chat-widget">
      <button id="mollieweb-chat-button" aria-label="Open chat">
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
        </svg>
      </button>

      <div id="mollieweb-chat-window">
        <div class="mollieweb-chat-header">
          <h3>Chat with us</h3>
          <button id="mollieweb-close-button" aria-label="Close chat">&times;</button>
        </div>
        <div class="mollieweb-chat-messages" id="mollieweb-chat-messages">
          <div class="mollieweb-message assistant">
            <div class="mollieweb-message-content">
              👋 Hello! How can I help you today?
            </div>
          </div>
          <div class="mollieweb-typing-indicator" id="mollieweb-typing-indicator">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
        <div class="mollieweb-chat-input-container">
          <div class="mollieweb-chat-input-wrapper">
            <input type="text" id="mollieweb-chat-input" placeholder="Type your message..." />
            <button id="mollieweb-send-button">Send</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Initialize widget
  function initWidget() {
    // Add styles
    const styleEl = document.createElement('style');
    styleEl.textContent = styles;
    document.head.appendChild(styleEl);

    // Add widget HTML
    const widgetContainer = document.createElement('div');
    widgetContainer.innerHTML = widgetHTML;
    document.body.appendChild(widgetContainer);

    // Initialize functionality
    let sessionId = localStorage.getItem('mollieweb-chat-session-id') || null;
    let isOpen = false;

    const chatButton = document.getElementById('mollieweb-chat-button');
    const chatWindow = document.getElementById('mollieweb-chat-window');
    const closeButton = document.getElementById('mollieweb-close-button');
    const chatInput = document.getElementById('mollieweb-chat-input');
    const sendButton = document.getElementById('mollieweb-send-button');
    const chatMessages = document.getElementById('mollieweb-chat-messages');
    const typingIndicator = document.getElementById('mollieweb-typing-indicator');

    // Toggle chat
    chatButton.addEventListener('click', () => {
      isOpen = !isOpen;
      chatWindow.classList.toggle('active', isOpen);
      if (isOpen) chatInput.focus();
    });

    closeButton.addEventListener('click', () => {
      isOpen = false;
      chatWindow.classList.remove('active');
    });

    // Send message
    async function sendMessage() {
      const message = chatInput.value.trim();
      if (!message) return;

      chatInput.disabled = true;
      sendButton.disabled = true;

      addMessage('user', message);
      chatInput.value = '';

      typingIndicator.classList.add('active');

      try {
        const response = await fetch(`${CONFIG.API_BASE_URL}/webhook`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ message, sessionId }),
        });

        const data = await response.json();

        if (data.sessionId) {
          sessionId = data.sessionId;
          localStorage.setItem('mollieweb-chat-session-id', sessionId);
        }

        typingIndicator.classList.remove('active');
        addMessage('assistant', data.response);
      } catch (error) {
        console.error('Chat error:', error);
        typingIndicator.classList.remove('active');
        addMessage('assistant', 'Sorry, I encountered an error. Please try again.');
      } finally {
        chatInput.disabled = false;
        sendButton.disabled = false;
        chatInput.focus();
      }
    }

    sendButton.addEventListener('click', sendMessage);
    chatInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendMessage();
      }
    });

    // Add message
    function addMessage(role, content) {
      const messageDiv = document.createElement('div');
      messageDiv.className = `mollieweb-message ${role}`;

      const timeStr = new Date().toLocaleTimeString([], { 
        hour: '2-digit', 
        minute: '2-digit' 
      });

      messageDiv.innerHTML = `
        <div class="mollieweb-message-content">${content}</div>
        <div class="mollieweb-message-time">${timeStr}</div>
      `;

      chatMessages.insertBefore(messageDiv, typingIndicator);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // End session on page unload
    window.addEventListener('beforeunload', () => {
      if (sessionId) {
        navigator.sendBeacon(
          `${CONFIG.API_BASE_URL}/end-session`,
          JSON.stringify({ sessionId })
        );
      }
    });
  }

  // Wait for DOM to load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
