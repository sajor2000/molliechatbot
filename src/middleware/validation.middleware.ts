import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * Input Validation Middleware
 * Sanitizes and validates user inputs to prevent XSS, injection attacks, and oversized payloads
 */

// Configuration
const MAX_MESSAGE_LENGTH = 4000; // Maximum characters for chat message
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_EXTENSIONS = [
  '.pdf', '.docx', '.doc', '.txt', '.md',
  '.json', '.csv', '.xml', '.html'
];

/**
 * Sanitize string input for chat messages
 * Removes dangerous characters while preserving readability
 * Note: HTML encoding is handled by the frontend when rendering
 */
export function sanitizeString(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  // Remove null bytes and control characters (except newlines and tabs)
  let sanitized = input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');

  // Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Sanitize string for HTML output (use in frontend rendering)
 * Encodes HTML special characters to prevent XSS
 */
export function sanitizeForHTML(input: string): string {
  if (!input || typeof input !== 'string') {
    return '';
  }

  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Validate message length
 */
export function validateMessageLength(message: string): boolean {
  return message.length > 0 && message.length <= MAX_MESSAGE_LENGTH;
}

/**
 * Validate file extension
 */
export function validateFileExtension(filename: string): boolean {
  const ext = filename.toLowerCase().slice(filename.lastIndexOf('.'));
  return ALLOWED_FILE_EXTENSIONS.includes(ext);
}

/**
 * Validate file size
 */
export function validateFileSize(sizeInBytes: number): boolean {
  return sizeInBytes > 0 && sizeInBytes <= MAX_FILE_SIZE;
}

/**
 * Sanitize filename to prevent path traversal
 * Removes directory traversal attempts (../, ..\, etc.)
 */
export function sanitizeFilename(filename: string): string {
  if (!filename || typeof filename !== 'string') {
    return '';
  }

  // Remove path traversal attempts
  let sanitized = filename.replace(/\.\.[/\\]/g, '');

  // Remove absolute paths
  sanitized = sanitized.replace(/^[/\\]/, '');

  // Remove drive letters (Windows)
  sanitized = sanitized.replace(/^[A-Za-z]:/, '');

  // Remove any remaining directory separators
  sanitized = sanitized.replace(/[/\\]/g, '_');

  // Remove null bytes
  sanitized = sanitized.replace(/\0/g, '');

  // Limit length
  if (sanitized.length > 255) {
    const ext = sanitized.slice(sanitized.lastIndexOf('.'));
    sanitized = sanitized.slice(0, 255 - ext.length) + ext;
  }

  return sanitized;
}

/**
 * Validate session ID format
 * Should be alphanumeric with hyphens/underscores only
 */
export function validateSessionId(sessionId: string): boolean {
  if (!sessionId || typeof sessionId !== 'string') {
    return false;
  }

  // Allow alphanumeric, hyphens, and underscores
  const validPattern = /^[a-zA-Z0-9_-]{1,128}$/;
  return validPattern.test(sessionId);
}

/**
 * Validate email format
 */
export function validateEmail(email: string): boolean {
  if (!email || typeof email !== 'string') {
    return false;
  }

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailPattern.test(email) && email.length <= 254;
}

/**
 * Middleware to validate chat message input
 */
export function validateChatMessage(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const { message, sessionId } = req.body;

    // Validate message exists
    if (!message || typeof message !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Message is required and must be a string'
      });
    }

    // Validate message length
    if (!validateMessageLength(message)) {
      return res.status(400).json({
        error: 'Bad request',
        message: `Message must be between 1 and ${MAX_MESSAGE_LENGTH} characters`
      });
    }

    // Validate session ID if provided
    if (sessionId && !validateSessionId(sessionId)) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Invalid session ID format'
      });
    }

    // Sanitize inputs (store sanitized versions back in body)
    req.body.message = sanitizeString(message);
    if (sessionId) {
      req.body.sessionId = sessionId; // Session ID is already validated
    }

    return handler(req, res);
  };
}

/**
 * Middleware to validate file upload
 */
export function validateFileUpload(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const { filename, fileSize } = req.body;

    // Validate filename
    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Filename is required'
      });
    }

    // Validate file extension
    if (!validateFileExtension(filename)) {
      return res.status(400).json({
        error: 'Bad request',
        message: `File type not allowed. Allowed types: ${ALLOWED_FILE_EXTENSIONS.join(', ')}`
      });
    }

    // Validate file size
    if (fileSize && !validateFileSize(fileSize)) {
      return res.status(400).json({
        error: 'Bad request',
        message: `File size must be less than ${MAX_FILE_SIZE / (1024 * 1024)}MB`
      });
    }

    // Sanitize filename
    req.body.filename = sanitizeFilename(filename);

    return handler(req, res);
  };
}

/**
 * Generic request validation middleware
 * Validates common security concerns for all endpoints
 */
export function validateRequest(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Check for suspiciously large payloads
    const contentLength = req.headers['content-length'];
    if (contentLength && parseInt(contentLength) > 50 * 1024 * 1024) { // 50MB max
      return res.status(413).json({
        error: 'Payload too large',
        message: 'Request body exceeds maximum allowed size'
      });
    }

    // Validate Content-Type for POST/PUT requests
    if (['POST', 'PUT', 'PATCH'].includes(req.method || '')) {
      const contentType = req.headers['content-type'];
      if (!contentType || !contentType.includes('application/json')) {
        return res.status(415).json({
          error: 'Unsupported media type',
          message: 'Content-Type must be application/json'
        });
      }
    }

    return handler(req, res);
  };
}
