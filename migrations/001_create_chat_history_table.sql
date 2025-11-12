-- Migration: Create chat_history table for per-turn persistence
-- Date: 2025-01-11
-- Purpose: Store individual chat messages immediately as they're sent/received
--          Provides granular persistence independent of KV session storage

-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  session_id TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_history_session_id ON chat_history(session_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_session_created ON chat_history(session_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_history_created_at ON chat_history(created_at DESC);

-- Add comment to table
COMMENT ON TABLE chat_history IS 'Per-turn chat message storage for real-time persistence';
COMMENT ON COLUMN chat_history.session_id IS 'Links to conversation session ID from KV storage';
COMMENT ON COLUMN chat_history.role IS 'Message sender: user, assistant, or system';
COMMENT ON COLUMN chat_history.content IS 'Full message text content';
COMMENT ON COLUMN chat_history.created_at IS 'Timestamp when message was created';

-- Verify existing conversations table (should already exist)
-- This table stores complete conversation snapshots from end-session bulk saves
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'conversations'
  ) THEN
    RAISE NOTICE 'Creating conversations table...';

    CREATE TABLE conversations (
      id TEXT PRIMARY KEY,
      messages JSONB NOT NULL,
      start_time TIMESTAMP WITH TIME ZONE NOT NULL,
      end_time TIMESTAMP WITH TIME ZONE,
      metadata JSONB,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
    );

    CREATE INDEX idx_conversations_start_time ON conversations(start_time DESC);
    CREATE INDEX idx_conversations_created_at ON conversations(created_at DESC);
  END IF;
END
$$;
