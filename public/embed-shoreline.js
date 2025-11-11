/**
 * Shoreline Dental Chicago - Chat Widget Embed Script (Modernized UI/UX)
 *
 * Usage: Add this script tag to your website before the closing </body> tag:
 * <script src="https://your-production-domain.com/embed-shoreline.js"></script>
 *
 * Or with custom configuration:
 * <script>
 *   window.SHORELINE_CHAT_CONFIG = {
 *     apiBaseUrl: 'https://your-api-domain.com/api/chat'
 *   };
 * </script>
 * <script src="https://your-production-domain.com/embed-shoreline.js"></script>
 */

(function() {
  'use strict';

  // Configuration - can be overridden via window.SHORELINE_CHAT_CONFIG
  const CONFIG = Object.assign({
    apiBaseUrl: 'https://your-production-domain.com/api/chat', // UPDATE THIS IN PRODUCTION
    brandName: 'Shoreline Dental Chicago',
    brandColor: '#2C5F8D', // Professional dental blue
    accentColor: '#4A90A4', // Lighter blue for hover states
    goldAccent: '#C9A961', // Gold for CTA buttons
    welcomeMessage: '👋 Hello! What can I do for you today?',
    position: 'bottom-right', // 'bottom-right' or 'bottom-left'
    suggestedActions: [
      'I\\'d like to schedule an appointment'
    ]
  }, window.SHORELINE_CHAT_CONFIG || {});

  // Generate unique session ID
  function generateSessionId() {
    return 'session_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Get or create session ID
  function getSessionId() {
    let sessionId = localStorage.getItem('shoreline-chat-session-id');
    if (!sessionId) {
      sessionId = generateSessionId();
      localStorage.setItem('shoreline-chat-session-id', sessionId);
    }
    return sessionId;
  }

  // Inject CSS
  const style = document.createElement('style');
  style.textContent = `
    #shoreline-chat-widget * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
    }

    #shoreline-chat-widget {
      position: fixed;
      ${CONFIG.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      bottom: 20px;
      z-index: 999999;
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

    #shoreline-chat-button svg {
      width: 32px;
      height: 32px;
      fill: white;
      position: relative;
      z-index: 1;
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

    #shoreline-chat-window {
      position: fixed;
      ${CONFIG.position.includes('right') ? 'right: 20px;' : 'left: 20px;'}
      bottom: 104px;
      width: 400px;
      max-width: calc(100vw - 40px);
      height: 600px;
      max-height: calc(100vh - 140px);
      background: white;
      border-radius: 20px;
      box-shadow: 0 12px 48px rgba(0, 0, 0, 0.25);
      display: none;
      flex-direction: column;
      overflow: hidden;
      animation: slideUp 0.3s ease-out;
      transition: all 0.3s ease;
    }

    #shoreline-chat-window.active {
      display: flex;
    }

    #shoreline-chat-window.expanded {
      width: 90vw;
      max-width: 1200px;
      height: 90vh;
      right: 50%;
      transform: translateX(50%);
    }

    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px);
      }
      to {
        opacity: 1;
        transform: translateY(0);
      }
    }

    .shoreline-chat-header {
      background: ${CONFIG.brandColor};
      color: white;
      padding: 24px 20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-radius: 20px 20px 0 0;
    }

    .shoreline-chat-header-content {
      flex: 1;
    }

    .shoreline-chat-header-content h3 {
      margin: 0;
      font-size: 18px;
      font-weight: 600;
      margin-bottom: 4px;
    }

    .shoreline-chat-header-content p {
      margin: 0;
      font-size: 13px;
      opacity: 0.9;
    }

    .shoreline-chat-header-actions {
      display: flex;
      gap: 8px;
      align-items: center;
    }

    .shoreline-header-button {
      background: rgba(255, 255, 255, 0.2);
      border: none;
      color: white;
      cursor: pointer;
      width: 32px;
      height: 32px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      position: relative;
    }

    .shoreline-header-button:hover {
      background: rgba(255, 255, 255, 0.3);
      transform: scale(1.1);
    }

    .shoreline-header-button svg {
      width: 18px;
      height: 18px;
      fill: white;
    }

    .shoreline-header-button .tooltip {
      position: absolute;
      bottom: -32px;
      right: 0;
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      white-space: nowrap;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.2s;
    }

    .shoreline-header-button:hover .tooltip {
      opacity: 1;
    }

    .shoreline-chat-messages {
      flex: 1;
      overflow-y: auto;
      padding: 20px;
      background: #f8f9fa;
    }

    .shoreline-chat-messages::-webkit-scrollbar {
      width: 8px;
    }

    .shoreline-chat-messages::-webkit-scrollbar-track {
      background: #f1f1f1;
    }

    .shoreline-chat-messages::-webkit-scrollbar-thumb {
      background: #c1c1c1;
      border-radius: 4px;
    }

    .shoreline-message {
      margin-bottom: 16px;
      animation: fadeIn 0.3s ease-out;
      display: flex;
      align-items: flex-start;
      gap: 10px;
    }

    @keyframes fadeIn {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }

    .shoreline-message.user {
      flex-direction: row-reverse;
    }

    .shoreline-message-avatar {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: ${CONFIG.accentColor};
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      font-size: 16px;
    }

    .shoreline-message.user .shoreline-message-avatar {
      background: ${CONFIG.brandColor};
    }

    .shoreline-message-wrapper {
      flex: 1;
      max-width: 75%;
    }

    .shoreline-message-content {
      padding: 14px 18px;
      border-radius: 16px;
      word-wrap: break-word;
      line-height: 1.5;
      font-size: 15px;
    }

    .shoreline-message.user .shoreline-message-content {
      background: ${CONFIG.brandColor};
      color: white;
      border-bottom-right-radius: 4px;
    }

    .shoreline-message.assistant .shoreline-message-content {
      background: white;
      color: #1f2937;
      border: 1px solid #e5e7eb;
      border-bottom-left-radius: 4px;
    }

    .shoreline-message-time {
      font-size: 11px;
      color: #9ca3af;
      margin-top: 6px;
      padding: 0 4px;
    }

    .shoreline-suggested-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin-bottom: 16px;
      animation: fadeIn 0.3s ease-out;
    }

    .shoreline-suggested-action {
      background: white;
      border: 2px solid ${CONFIG.accentColor};
      color: ${CONFIG.brandColor};
      padding: 12px 18px;
      border-radius: 20px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: all 0.2s;
      text-align: center;
      flex: 1;
      min-width: 200px;
    }

    .shoreline-suggested-action:hover {
      background: ${CONFIG.accentColor};
      color: white;
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(74, 144, 164, 0.3);
    }

    .shoreline-suggested-action:active {
      transform: translateY(0);
    }

    .shoreline-typing {
      display: none;
      padding: 14px 18px;
      background: white;
      border: 1px solid #e5e7eb;
      border-radius: 16px;
      width: fit-content;
      border-bottom-left-radius: 4px;
    }

    .shoreline-typing.active {
      display: block;
    }

    .shoreline-typing span {
      display: inline-block;
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: ${CONFIG.accentColor};
      margin: 0 2px;
      animation: typing 1.4s infinite;
    }

    .shoreline-typing span:nth-child(2) {
      animation-delay: 0.2s;
    }

    .shoreline-typing span:nth-child(3) {
      animation-delay: 0.4s;
    }

    @keyframes typing {
      0%, 60%, 100% { transform: translateY(0); opacity: 0.7; }
      30% { transform: translateY(-10px); opacity: 1; }
    }

    .shoreline-chat-input-container {
      padding: 16px 20px;
      background: white;
      border-top: 1px solid #e5e7eb;
      border-radius: 0 0 20px 20px;
    }

    .shoreline-chat-input-wrapper {
      display: flex;
      gap: 10px;
      align-items: center;
    }

    #shoreline-chat-input {
      flex: 1;
      padding: 14px 16px;
      border: 2px solid #e5e7eb;
      border-radius: 12px;
      font-size: 15px;
      outline: none;
      transition: border-color 0.2s;
    }

    #shoreline-chat-input:focus {
      border-color: ${CONFIG.accentColor};
    }

    #shoreline-send-button {
      width: 44px;
      height: 44px;
      background: ${CONFIG.brandColor};
      color: white;
      border: none;
      border-radius: 12px;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
      flex-shrink: 0;
    }

    #shoreline-send-button:hover:not(:disabled) {
      background: ${CONFIG.accentColor};
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(44, 95, 141, 0.3);
    }

    #shoreline-send-button:active:not(:disabled) {
      transform: translateY(0);
    }

    #shoreline-send-button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
      transform: none;
    }

    #shoreline-send-button svg {
      width: 20px;
      height: 20px;
      fill: white;
    }

    .shoreline-powered-by {
      text-align: center;
      padding: 8px;
      font-size: 11px;
      color: #9ca3af;
      background: #f8f9fa;
    }

    /* Mobile responsive */
    @media (max-width: 480px) {
      #shoreline-chat-widget {
        ${CONFIG.position.includes('right') ? 'right: 10px;' : 'left: 10px;'}
        bottom: 10px;
      }

      #shoreline-chat-window {
        width: calc(100vw - 20px);
        height: calc(100vh - 100px);
        ${CONFIG.position.includes('right') ? 'right: 10px;' : 'left: 10px;'}
        bottom: 84px;
      }

      #shoreline-chat-window.expanded {
        width: calc(100vw - 20px);
        height: calc(100vh - 100px);
        transform: none;
        right: 10px;
      }

      #shoreline-chat-button {
        width: 56px;
        height: 56px;
      }

      .shoreline-chat-header {
        padding: 20px 16px;
      }

      .shoreline-chat-header-content h3 {
        font-size: 16px;
      }

      .shoreline-chat-header-content p {
        font-size: 12px;
      }

      .shoreline-suggested-action {
        min-width: 100%;
      }

      .shoreline-message-wrapper {
        max-width: 85%;
      }

      .shoreline-header-button {
        width: 36px;
        height: 36px;
        min-width: 36px;
        min-height: 36px;
      }
    }
  `;
  document.head.appendChild(style);

  // Create suggested actions HTML
  const suggestedActionsHTML = CONFIG.suggestedActions.length > 0
    ? `<div class="shoreline-suggested-actions" id="shoreline-suggested-actions">
        ${CONFIG.suggestedActions.map((action, index) =>
          `<button class="shoreline-suggested-action" data-action="${index}">${action}</button>`
        ).join('')}
      </div>`
    : '';

  // Create widget HTML
  const widgetHTML = `
    <div id="shoreline-chat-widget">
      <button id="shoreline-chat-button" aria-label="Open chat">
        <div class="pulse"></div>
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
          <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
        </svg>
      </button>

      <div id="shoreline-chat-window">
        <div class="shoreline-chat-header">
          <div class="shoreline-chat-header-content">
            <h3>Welcome to ${CONFIG.brandName}</h3>
            <p>Speak to me in any language!</p>
          </div>
          <div class="shoreline-chat-header-actions">
            <button class="shoreline-header-button" id="shoreline-expand-button" aria-label="Expand chat">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
              </svg>
              <span class="tooltip">Expand</span>
            </button>
            <button class="shoreline-header-button" id="shoreline-refresh-button" aria-label="Restart conversation">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
              </svg>
              <span class="tooltip">Restart</span>
            </button>
            <button class="shoreline-header-button shoreline-chat-close" aria-label="Close chat">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
              </svg>
              <span class="tooltip">Close</span>
            </button>
          </div>
        </div>

        <div class="shoreline-chat-messages" id="shoreline-chat-messages">
          <div class="shoreline-message assistant">
            <div class="shoreline-message-avatar">🤖</div>
            <div class="shoreline-message-wrapper">
              <div class="shoreline-message-content">
                ${CONFIG.welcomeMessage}
              </div>
            </div>
          </div>
          ${suggestedActionsHTML}
          <div class="shoreline-typing" id="shoreline-typing">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>

        <div class="shoreline-chat-input-container">
          <div class="shoreline-chat-input-wrapper">
            <input
              type="text"
              id="shoreline-chat-input"
              placeholder="Type something..."
              aria-label="Chat message"
              autocomplete="off"
            />
            <button id="shoreline-send-button" aria-label="Send message">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
              </svg>
            </button>
          </div>
        </div>

        <div class="shoreline-powered-by">
          Powered by AI • Secure & Private
        </div>
      </div>
    </div>
  `;

  // Inject widget into page
  const widgetContainer = document.createElement('div');
  widgetContainer.innerHTML = widgetHTML;
  document.body.appendChild(widgetContainer);

  // Widget state
  let sessionId = getSessionId();
  let isOpen = false;
  let isExpanded = false;
  let suggestedActionsShown = true;

  // DOM elements
  const chatButton = document.getElementById('shoreline-chat-button');
  const chatWindow = document.getElementById('shoreline-chat-window');
  const closeButton = document.querySelector('.shoreline-chat-close');
  const expandButton = document.getElementById('shoreline-expand-button');
  const refreshButton = document.getElementById('shoreline-refresh-button');
  const chatInput = document.getElementById('shoreline-chat-input');
  const sendButton = document.getElementById('shoreline-send-button');
  const chatMessages = document.getElementById('shoreline-chat-messages');
  const typingIndicator = document.getElementById('shoreline-typing');
  const suggestedActionsContainer = document.getElementById('shoreline-suggested-actions');

  // Toggle chat window
  function toggleChat() {
    isOpen = !isOpen;
    chatWindow.classList.toggle('active', isOpen);
    if (isOpen) {
      chatInput.focus();
      // Remove pulse animation after first open
      const pulse = chatButton.querySelector('.pulse');
      if (pulse) pulse.remove();
    }
  }

  // Toggle expanded view
  function toggleExpand() {
    isExpanded = !isExpanded;
    chatWindow.classList.toggle('expanded', isExpanded);
    const expandIcon = expandButton.querySelector('svg');
    if (isExpanded) {
      expandIcon.innerHTML = '<path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/>';
      expandButton.querySelector('.tooltip').textContent = 'Minimize';
    } else {
      expandIcon.innerHTML = '<path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>';
      expandButton.querySelector('.tooltip').textContent = 'Expand';
    }
  }

  // Restart conversation
  function restartConversation() {
    if (confirm('Are you sure you want to restart the conversation? This will clear your chat history.')) {
      // Clear session
      sessionId = generateSessionId();
      localStorage.setItem('shoreline-chat-session-id', sessionId);

      // Clear messages except welcome
      const messages = chatMessages.querySelectorAll('.shoreline-message:not(:first-child)');
      messages.forEach(msg => msg.remove());

      // Show suggested actions again
      if (suggestedActionsContainer && !suggestedActionsShown) {
        suggestedActionsContainer.style.display = 'flex';
        suggestedActionsShown = true;
      }

      chatInput.value = '';
      chatInput.focus();
    }
  }

  chatButton.addEventListener('click', toggleChat);
  closeButton.addEventListener('click', () => {
    isOpen = false;
    chatWindow.classList.remove('active');
  });
  expandButton.addEventListener('click', toggleExpand);
  refreshButton.addEventListener('click', restartConversation);

  // Handle suggested actions
  if (suggestedActionsContainer) {
    suggestedActionsContainer.addEventListener('click', (e) => {
      const actionButton = e.target.closest('.shoreline-suggested-action');
      if (actionButton) {
        const actionText = actionButton.textContent;
        chatInput.value = actionText;
        chatInput.focus();
      }
    });
  }

  // Add message to chat
  function addMessage(role, content) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `shoreline-message ${role}`;

    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const avatar = role === 'user' ? '👤' : '🤖';

    messageDiv.innerHTML = `
      <div class="shoreline-message-avatar">${avatar}</div>
      <div class="shoreline-message-wrapper">
        <div class="shoreline-message-content">${escapeHtml(content)}</div>
        <div class="shoreline-message-time">${timeStr}</div>
      </div>
    `;

    chatMessages.insertBefore(messageDiv, typingIndicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Hide suggested actions after first message
    if (suggestedActionsContainer && suggestedActionsShown && role === 'user') {
      suggestedActionsContainer.style.display = 'none';
      suggestedActionsShown = false;
    }
  }

  // Escape HTML to prevent XSS
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Send message
  async function sendMessage() {
    const message = chatInput.value.trim();
    if (!message) return;

    // Disable input
    chatInput.disabled = true;
    sendButton.disabled = true;

    // Add user message
    addMessage('user', message);
    chatInput.value = '';

    // Show typing indicator
    typingIndicator.classList.add('active');

    try {
      const response = await fetch(`${CONFIG.apiBaseUrl}/webhook`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message,
          sessionId,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Update session ID
      if (data.sessionId) {
        sessionId = data.sessionId;
        localStorage.setItem('shoreline-chat-session-id', sessionId);
      }

      // Hide typing indicator
      typingIndicator.classList.remove('active');

      // Add assistant response
      addMessage('assistant', data.response || 'I apologize, but I encountered an error. Please try again.');

    } catch (error) {
      console.error('Shoreline Chat Error:', error);
      typingIndicator.classList.remove('active');
      addMessage('assistant', 'I apologize, but I\\'m having trouble connecting right now. Please try again in a moment, or call us at (312) 266-3399.');
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

  // End session on page unload
  window.addEventListener('beforeunload', () => {
    if (sessionId) {
      navigator.sendBeacon(
        `${CONFIG.apiBaseUrl}/end-session`,
        JSON.stringify({ sessionId })
      );
    }
  });

  console.log('Shoreline Dental Chat Widget loaded successfully');
})();
