/**
 * Supabase Database Service for Conversation Storage
 *
 * Uses Supabase PostgreSQL instead of MongoDB for conversation persistence.
 * This eliminates the need for a separate MongoDB Atlas account.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { Conversation, ChatMessage } from '../types';
import config from '../config';

export class SupabaseDatabaseService {
  private client: SupabaseClient | null = null;
  private tableName = 'conversations';
  private chatHistoryTable = 'chat_history';

  constructor() {
    this.initialize();
  }

  private initialize(): void {
    if (!config.supabaseUrl || !config.supabaseKey) {
      throw new Error('Supabase credentials are not configured');
    }

    this.client = createClient(config.supabaseUrl, config.supabaseKey);
    console.log('Supabase database initialized');
  }

  private ensureClient(): SupabaseClient {
    if (!this.client) {
      this.initialize();
    }
    return this.client!;
  }

  /**
   * Initialize database table (run once during setup)
   *
   * SQL to run in Supabase SQL Editor:
   *
   * CREATE TABLE IF NOT EXISTS conversations (
   *   id TEXT PRIMARY KEY,
   *   messages JSONB NOT NULL,
   *   start_time TIMESTAMP WITH TIME ZONE NOT NULL,
   *   end_time TIMESTAMP WITH TIME ZONE,
   *   metadata JSONB,
   *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   * );
   *
   * CREATE INDEX idx_conversations_start_time ON conversations(start_time DESC);
   * CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
   */
  async ensureTable(): Promise<void> {
    // Note: Table creation should be done manually in Supabase dashboard
    // or via migration. This method is for documentation purposes.
    console.log(`
    ⚠️  Ensure the following table exists in your Supabase database:

    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      messages JSONB NOT NULL,
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX idx_conversations_start_time ON conversations(start_time DESC);
    CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
    `);
  }

  /**
   * Save a conversation (insert or update)
   */
  async saveConversation(conversation: Conversation): Promise<void> {
    const client = this.ensureClient();

    try {
      const { error } = await client
        .from(this.tableName)
        .upsert({
          id: conversation.id,
          messages: conversation.messages,
          start_time: conversation.startTime,
          end_time: conversation.endTime || null,
          metadata: conversation.metadata || {},
        }, {
          onConflict: 'id'
        });

      if (error) {
        throw new Error(`Supabase upsert error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving conversation to Supabase:', error);
      throw error;
    }
  }

  /**
   * Append a single chat message to the chat history table
   * Schema (ensure exists in Supabase):
   * CREATE TABLE IF NOT EXISTS chat_history (
   *   id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
   *   session_id TEXT NOT NULL,
   *   role TEXT NOT NULL,
   *   content TEXT NOT NULL,
   *   created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   * );
   */
  async saveChatMessage(entry: {
    sessionId: string;
    role: ChatMessage['role'];
    content: string;
    createdAt?: Date;
  }): Promise<void> {
    await this.saveChatMessages([entry]);
  }

  /**
   * Batch insert multiple chat history rows in a single request
   */
  async saveChatMessages(entries: Array<{
    sessionId: string;
    role: ChatMessage['role'];
    content: string;
    createdAt?: Date;
  }>): Promise<void> {
    if (!entries.length) {
      return;
    }

    const client = this.ensureClient();

    try {
      const payload = entries.map(entry => ({
        session_id: entry.sessionId,
        role: entry.role,
        content: entry.content,
        created_at: (entry.createdAt || new Date()).toISOString(),
      }));

      const { error } = await client
        .from(this.chatHistoryTable)
        .insert(payload, { defaultToNull: false });

      if (error) {
        throw new Error(`Supabase chat history error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error saving chat history batch:', error);
    }
  }

  /**
   * Get conversations by date
   */
  async getConversationsByDate(date: string): Promise<Conversation[]> {
    const client = this.ensureClient();

    try {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .gte('start_time', startDate.toISOString())
        .lt('start_time', endDate.toISOString())
        .order('start_time', { ascending: false });

      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      // Map database format to Conversation type
      return data.map(row => ({
        id: row.id,
        messages: row.messages,
        startTime: new Date(row.start_time),
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        metadata: row.metadata || {},
      }));
    } catch (error) {
      console.error('Error fetching conversations by date:', error);
      return [];
    }
  }

  /**
   * Get yesterday's conversations
   */
  async getYesterdayConversations(): Promise<Conversation[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    return this.getConversationsByDate(dateStr);
  }

  /**
   * Get all conversations
   */
  async getAllConversations(): Promise<Conversation[]> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .order('start_time', { ascending: false });

      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      return data.map(row => ({
        id: row.id,
        messages: row.messages,
        startTime: new Date(row.start_time),
        endTime: row.end_time ? new Date(row.end_time) : undefined,
        metadata: row.metadata || {},
      }));
    } catch (error) {
      console.error('Error fetching all conversations:', error);
      return [];
    }
  }

  /**
   * Get conversation by ID
   */
  async getConversationById(id: string): Promise<Conversation | null> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from(this.tableName)
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw new Error(`Supabase query error: ${error.message}`);
      }

      if (!data) {
        return null;
      }

      return {
        id: data.id,
        messages: data.messages,
        startTime: new Date(data.start_time),
        endTime: data.end_time ? new Date(data.end_time) : undefined,
        metadata: data.metadata || {},
      };
    } catch (error) {
      console.error('Error fetching conversation by ID:', error);
      return null;
    }
  }

  /**
   * Delete old conversations (data cleanup)
   */
  async deleteOldConversations(daysToKeep: number = 90): Promise<number> {
    const client = this.ensureClient();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const { data, error } = await client
        .from(this.tableName)
        .delete()
        .lt('start_time', cutoffDate.toISOString())
        .select();

      if (error) {
        throw new Error(`Supabase delete error: ${error.message}`);
      }

      return data ? data.length : 0;
    } catch (error) {
      console.error('Error deleting old conversations:', error);
      return 0;
    }
  }

  /**
   * Get conversation count
   */
  async getConversationCount(): Promise<number> {
    const client = this.ensureClient();

    try {
      const { count, error } = await client
        .from(this.tableName)
        .select('*', { count: 'exact', head: true });

      if (error) {
        throw new Error(`Supabase count error: ${error.message}`);
      }

      return count || 0;
    } catch (error) {
      console.error('Error getting conversation count:', error);
      return 0;
    }
  }

  /**
   * Get conversation messages from chat_history by session ID
   */
  async getConversation(sessionId: string): Promise<ChatMessage[]> {
    const client = this.ensureClient();

    try {
      const { data, error } = await client
        .from(this.chatHistoryTable)
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (error) {
        throw new Error(`Supabase query error: ${error.message}`);
      }

      if (!data) {
        return [];
      }

      // Map database format to ChatMessage type
      return data.map(row => ({
        role: row.role as ChatMessage['role'],
        content: row.content,
        timestamp: new Date(row.created_at),
      }));
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      return [];
    }
  }

  /**
   * Delete conversation messages by session ID
   */
  async deleteConversation(sessionId: string): Promise<void> {
    const client = this.ensureClient();

    try {
      const { error } = await client
        .from(this.chatHistoryTable)
        .delete()
        .eq('session_id', sessionId);

      if (error) {
        throw new Error(`Supabase delete error: ${error.message}`);
      }
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }
}

// Singleton instance
export const supabaseDatabaseService = new SupabaseDatabaseService();
