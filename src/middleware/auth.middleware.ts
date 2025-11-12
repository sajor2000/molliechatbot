import type { VercelRequest, VercelResponse } from '@vercel/node';
import { kvAuthService } from '../services/kv-auth.service';

export interface AuthRequest extends VercelRequest {
  authenticated?: boolean;
}

/**
 * Generate a secure random token and store in KV
 */
export async function generateToken(): Promise<string> {
  return await kvAuthService.generateToken();
}

/**
 * Verify admin password using bcrypt
 */
export async function verifyPassword(password: string): Promise<boolean> {
  return await kvAuthService.verifyPassword(password);
}

/**
 * Verify token is valid and not expired
 */
export async function verifyToken(token: string): Promise<boolean> {
  return await kvAuthService.verifyToken(token);
}

/**
 * Revoke a token
 */
export async function revokeToken(token: string): Promise<boolean> {
  return await kvAuthService.revokeToken(token);
}

/**
 * Middleware to protect admin routes
 */
export function requireAuth(
  handler: (req: AuthRequest, res: VercelResponse) => Promise<any>
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

    const isValid = await verifyToken(token);
    if (!isValid) {
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
