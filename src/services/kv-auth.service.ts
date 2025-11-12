import { kv } from '@vercel/kv';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/**
 * KV-based Authentication Service
 * Replaces in-memory Map storage with Vercel KV for serverless persistence
 *
 * Tokens are stored with 24-hour TTL and automatically expire
 * Passwords are hashed using bcrypt for security
 */

const TOKEN_TTL = 86400; // 24 hours in seconds
const TOKEN_PREFIX = 'token:';
const SALT_ROUNDS = 10;

export class KVAuthService {
  /**
   * Generate and store a new authentication token
   */
  async generateToken(): Promise<string> {
    try {
      // Generate random token
      const token = this.createRandomToken();
      const tokenHash = await bcrypt.hash(token, SALT_ROUNDS);

      // Store token hash in KV with 24-hour expiration
      const key = `${TOKEN_PREFIX}${token}`;
      await kv.set(key, {
        hash: tokenHash,
        createdAt: Date.now(),
        expiresAt: Date.now() + (TOKEN_TTL * 1000)
      }, { ex: TOKEN_TTL });

      return token;
    } catch (error) {
      console.error('Error generating token:', error);
      throw new Error('Failed to generate authentication token');
    }
  }

  /**
   * Verify if a token is valid
   */
  async verifyToken(token: string): Promise<boolean> {
    try {
      if (!token) {
        return false;
      }

      const key = `${TOKEN_PREFIX}${token}`;
      const tokenData = await kv.get<{
        hash: string;
        createdAt: number;
        expiresAt: number;
      }>(key);

      if (!tokenData) {
        return false;
      }

      // Check if token has expired (double-check even though KV should auto-delete)
      if (Date.now() > tokenData.expiresAt) {
        await this.revokeToken(token);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error verifying token:', error);
      return false;
    }
  }

  /**
   * Revoke (delete) a token
   */
  async revokeToken(token: string): Promise<boolean> {
    try {
      const key = `${TOKEN_PREFIX}${token}`;
      await kv.del(key);
      return true;
    } catch (error) {
      console.error('Error revoking token:', error);
      return false;
    }
  }

  /**
   * Verify admin password using bcrypt
   */
  async verifyPassword(password: string): Promise<boolean> {
    try {
      const adminPasswordHash = process.env.ADMIN_PASSWORD_HASH;

      if (!adminPasswordHash) {
        console.error('ADMIN_PASSWORD_HASH environment variable not configured');
        return false;
      }

      // Use bcrypt to compare password with hash
      return await bcrypt.compare(password, adminPasswordHash);
    } catch (error) {
      console.error('Error verifying password:', error);
      return false;
    }
  }

  /**
   * Generate cryptographically secure random token
   * Uses crypto.randomBytes instead of Math.random() for security
   */
  private createRandomToken(): string {
    // Generate 32 bytes (256 bits) of cryptographically secure random data
    // Convert to base64url for URL-safe token (43 characters)
    return crypto.randomBytes(32).toString('base64url');
  }

  /**
   * Hash a password for storage (utility function)
   * Use this to generate the ADMIN_PASSWORD_HASH environment variable
   */
  static async hashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
  }

  /**
   * Extend token TTL (refresh expiration)
   */
  async extendToken(token: string): Promise<boolean> {
    try {
      const key = `${TOKEN_PREFIX}${token}`;
      const tokenData = await kv.get<{
        hash: string;
        createdAt: number;
        expiresAt: number;
      }>(key);

      if (!tokenData) {
        return false;
      }

      // Update with fresh TTL
      tokenData.expiresAt = Date.now() + (TOKEN_TTL * 1000);
      await kv.set(key, tokenData, { ex: TOKEN_TTL });

      return true;
    } catch (error) {
      console.error('Error extending token:', error);
      return false;
    }
  }
}

// Export singleton instance
export const kvAuthService = new KVAuthService();

/**
 * Utility script to generate password hash
 * Run with: npx tsx -e "import { KVAuthService } from './src/services/kv-auth.service'; KVAuthService.hashPassword('your-password').then(console.log)"
 */
