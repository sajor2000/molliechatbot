import type { VercelRequest, VercelResponse } from '@vercel/node';

/**
 * CORS Middleware for Embed Widget
 * Allows the chatbot to be embedded on external websites with proper security
 */

// Allowed origins for CORS (configure via environment variable)
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  if (!envOrigins) {
    // Default: allow all in development, none in production
    return process.env.NODE_ENV === 'production' ? [] : ['*'];
  }

  // Parse comma-separated list
  return envOrigins.split(',').map(origin => origin.trim());
};

/**
 * Check if origin is allowed
 */
function isOriginAllowed(origin: string | undefined, allowedOrigins: string[]): boolean {
  if (!origin) {
    return false;
  }

  // SECURITY: NEVER allow '*' in production
  if (allowedOrigins.includes('*')) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🔴 SECURITY ERROR: ALLOWED_ORIGINS=* is forbidden in production');
      return false;
    }
    // Only allow wildcard in development
    return true;
  }

  // Check exact match
  if (allowedOrigins.includes(origin)) {
    return true;
  }

  // Check wildcard patterns (e.g., *.example.com)
  for (const allowed of allowedOrigins) {
    if (allowed.startsWith('*.')) {
      const domain = allowed.substring(2);
      if (origin.endsWith(domain)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * CORS middleware for chat API endpoints
 * Allows embedding the chatbot on external websites
 */
export function corsMiddleware(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const allowedOrigins = getAllowedOrigins();
    const origin = req.headers.origin;

    // Handle preflight OPTIONS request
    if (req.method === 'OPTIONS') {
      if (origin && isOriginAllowed(origin, allowedOrigins)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Access-Control-Allow-Credentials', 'true');
      }

      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key, X-Session-ID');
      res.setHeader('Access-Control-Max-Age', '86400'); // 24 hours
      return res.status(204).end();
    }

    // Set CORS headers for actual requests
    if (origin && isOriginAllowed(origin, allowedOrigins)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Credentials', 'true');
      res.setHeader('Access-Control-Expose-Headers', 'X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset');
    }

    return handler(req, res);
  };
}

/**
 * Strict CORS middleware for admin endpoints
 * Only allows requests from the same origin
 */
export function strictCorsMiddleware(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const origin = req.headers.origin;
    const host = req.headers.host;

    // For admin endpoints, only allow same-origin requests
    if (origin && !origin.includes(host || '')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Cross-origin requests not allowed for admin endpoints'
      });
    }

    return handler(req, res);
  };
}

/**
 * API Key validation middleware for embedded widgets
 * Validates X-API-Key header against allowed keys in KV
 */
export function validateApiKey(
  handler: (req: VercelRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const apiKey = req.headers['x-api-key'];

    // If API key validation is disabled, skip
    if (!process.env.REQUIRE_API_KEY || process.env.REQUIRE_API_KEY === 'false') {
      return handler(req, res);
    }

    if (!apiKey || typeof apiKey !== 'string') {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key is required'
      });
    }

    // Validate API key format (should be 32+ character hex string)
    if (!/^[a-f0-9]{32,}$/i.test(apiKey)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key format'
      });
    }

    // Validate against environment variable API keys
    // Future enhancement: Can use KV storage for dynamic API key management
    const validApiKeys = process.env.VALID_API_KEYS?.split(',') || [];

    if (!validApiKeys.includes(apiKey)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid API key'
      });
    }

    return handler(req, res);
  };
}
