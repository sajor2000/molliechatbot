import { kv } from '@vercel/kv';
import { Conversation, ChatMessage } from '../types';

/**
 * KV-based Session Service
 * Replaces in-memory Map storage with Vercel KV for serverless persistence
 *
 * Sessions are stored with 1-hour TTL and automatically expire
 * Key pattern: `session:{sessionId}`
 */

const SESSION_TTL = 3600; // 1 hour in seconds
const SESSION_PREFIX = 'session:';

export class KVSessionService {
  /**
   * Get session by ID
   */
  async getSession(sessionId: string): Promise<Conversation | null> {
    try {
      const key = `${SESSION_PREFIX}${sessionId}`;
      const session = await kv.get<Conversation>(key);
      return session;
    } catch (error) {
      console.error('Error getting session from KV:', error);
      return null;
    }
  }

  /**
   * Create or update session
   */
  async setSession(sessionId: string, conversation: Conversation): Promise<boolean> {
    try {
      const key = `${SESSION_PREFIX}${sessionId}`;
      await kv.set(key, conversation, { ex: SESSION_TTL });
      return true;
    } catch (error) {
      console.error('Error setting session in KV:', error);
      return false;
    }
  }

  /**
   * Add message to existing session
   */
  async addMessage(sessionId: string, message: ChatMessage): Promise<boolean> {
    try {
      const conversation = await this.getSession(sessionId);

      if (!conversation) {
        // Create new conversation if doesn't exist
        const newConversation: Conversation = {
          id: sessionId,
          messages: [message],
          startTime: new Date(),
          metadata: {},
        };
        return await this.setSession(sessionId, newConversation);
      }

      // Add message to existing conversation
      conversation.messages.push(message);
      return await this.setSession(sessionId, conversation);
    } catch (error) {
      console.error('Error adding message to session:', error);
      return false;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      const key = `${SESSION_PREFIX}${sessionId}`;
      await kv.del(key);
      return true;
    } catch (error) {
      console.error('Error deleting session from KV:', error);
      return false;
    }
  }

  /**
   * Extend session TTL (refresh expiration)
   */
  async extendSession(sessionId: string): Promise<boolean> {
    try {
      const conversation = await this.getSession(sessionId);
      if (!conversation) {
        return false;
      }

      // Re-set with fresh TTL
      return await this.setSession(sessionId, conversation);
    } catch (error) {
      console.error('Error extending session TTL:', error);
      return false;
    }
  }

  /**
   * End session and mark completion time
   */
  async endSession(sessionId: string): Promise<Conversation | null> {
    try {
      const conversation = await this.getSession(sessionId);

      if (!conversation) {
        return null;
      }

      // Mark end time
      conversation.endTime = new Date();

      // Delete from KV (session is ended)
      await this.deleteSession(sessionId);

      return conversation;
    } catch (error) {
      console.error('Error ending session:', error);
      return null;
    }
  }

  /**
   * Check if session exists
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      const key = `${SESSION_PREFIX}${sessionId}`;
      const exists = await kv.exists(key);
      return exists === 1;
    } catch (error) {
      console.error('Error checking session existence:', error);
      return false;
    }
  }
}

// Export singleton instance
export const kvSessionService = new KVSessionService();
