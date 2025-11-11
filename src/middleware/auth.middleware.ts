import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomBytes } from 'crypto';

// Simple in-memory token store (for serverless, this resets on each cold start)
// For production, consider using Redis or database storage
const activeTokens = new Map<string, { expires: number }>();

export interface AuthRequest extends VercelRequest {
  authenticated?: boolean;
}

/**
 * Generate a secure random token
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Verify admin password
 */
export function verifyPassword(password: string): boolean {
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    console.error('⚠️  ADMIN_PASSWORD not configured in environment variables');
    return false;
  }

  return password === adminPassword;
}

/**
 * Store token with expiration (24 hours)
 */
export function storeToken(token: string): void {
  const expiresIn = 24 * 60 * 60 * 1000; // 24 hours
  activeTokens.set(token, {
    expires: Date.now() + expiresIn,
  });
}

/**
 * Verify token is valid and not expired
 */
export function verifyToken(token: string): boolean {
  const tokenData = activeTokens.get(token);

  if (!tokenData) {
    return false;
  }

  // Check if expired
  if (Date.now() > tokenData.expires) {
    activeTokens.delete(token);
    return false;
  }

  return true;
}

/**
 * Revoke a token
 */
export function revokeToken(token: string): void {
  activeTokens.delete(token);
}

/**
 * Clean up expired tokens (called periodically)
 */
export function cleanupExpiredTokens(): void {
  const now = Date.now();
  for (const [token, data] of activeTokens.entries()) {
    if (now > data.expires) {
      activeTokens.delete(token);
    }
  }
}

/**
 * Middleware to protect admin routes
 */
export function requireAuth(
  handler: (req: AuthRequest, res: VercelResponse) => Promise<void>
) {
  return async (req: AuthRequest, res: VercelResponse) => {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Missing or invalid authorization header'
      });
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    if (!verifyToken(token)) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or expired token'
      });
    }

    // Token is valid, set flag and call handler
    req.authenticated = true;
    return handler(req, res);
  };
}
