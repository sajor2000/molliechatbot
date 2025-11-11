-- Supabase Database Setup for Mollieweb Chat Agent
-- Run this in your Supabase SQL Editor: https://app.supabase.com/project/_/sql

-- =============================================================================
-- CONVERSATIONS TABLE
-- Stores all chat conversations with messages and metadata
-- =============================================================================

CREATE TABLE IF NOT EXISTS conversations (
  id TEXT PRIMARY KEY,
  messages JSONB NOT NULL,
  start_time TIMESTAMP WITH TIME ZONE NOT NULL,
  end_time TIMESTAMP WITH TIME ZONE,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add helpful comment
COMMENT ON TABLE conversations IS 'Stores chat conversations from the Mollieweb chatbot';
COMMENT ON COLUMN conversations.id IS 'Unique conversation/session ID (UUID)';
COMMENT ON COLUMN conversations.messages IS 'Array of chat messages with role, content, and timestamp';
COMMENT ON COLUMN conversations.start_time IS 'When the conversation started';
COMMENT ON COLUMN conversations.end_time IS 'When the conversation ended (null if still active)';
COMMENT ON COLUMN conversations.metadata IS 'Additional data: userAgent, ipAddress, sessionId, etc.';

-- =============================================================================
-- INDEXES FOR PERFORMANCE
-- =============================================================================

-- Index for querying by date (used in daily summaries)
CREATE INDEX IF NOT EXISTS idx_conversations_start_time
ON conversations(start_time DESC);

-- Index for recent conversations
CREATE INDEX IF NOT EXISTS idx_conversations_created_at
ON conversations(created_at DESC);

-- Index for finding active conversations (no end_time)
CREATE INDEX IF NOT EXISTS idx_conversations_active
ON conversations(end_time)
WHERE end_time IS NULL;

-- =============================================================================
-- AUTOMATIC UPDATED_AT TRIGGER
-- =============================================================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_conversations_updated_at
BEFORE UPDATE ON conversations
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable if you want API key-level security
-- =============================================================================

-- For now, keep RLS disabled for service role access
-- You can enable this later if needed
ALTER TABLE conversations DISABLE ROW LEVEL SECURITY;

-- If you want to enable RLS in the future, use these policies:
-- ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
--
-- CREATE POLICY "Enable read access for service role" ON conversations
-- FOR SELECT USING (auth.role() = 'service_role');
--
-- CREATE POLICY "Enable insert access for service role" ON conversations
-- FOR INSERT WITH CHECK (auth.role() = 'service_role');
--
-- CREATE POLICY "Enable update access for service role" ON conversations
-- FOR UPDATE USING (auth.role() = 'service_role');

-- =============================================================================
-- SAMPLE QUERY TO VERIFY SETUP
-- =============================================================================

-- Check if table exists
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_name = 'conversations';

-- Check indexes
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'conversations';

-- =============================================================================
-- STORAGE BUCKET SETUP (for documents)
-- Run this in Supabase Storage dashboard or via SQL
-- =============================================================================

-- Note: Storage buckets are typically created via the Supabase dashboard
-- Go to: Storage → Create a new bucket
-- Bucket name: documents
-- Public: Yes (for easy access)
-- File size limit: 10MB
-- Allowed MIME types: application/pdf, text/plain, text/markdown

-- If you want to create it via SQL (advanced):
-- INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
-- VALUES (
--   'documents',
--   'documents',
--   true,
--   10485760, -- 10MB
--   ARRAY['application/pdf', 'text/plain', 'text/markdown']
-- );

-- =============================================================================
-- HELPFUL QUERIES
-- =============================================================================

-- Get conversation count
-- SELECT COUNT(*) FROM conversations;

-- Get conversations from yesterday
-- SELECT * FROM conversations
-- WHERE start_time >= CURRENT_DATE - INTERVAL '1 day'
--   AND start_time < CURRENT_DATE
-- ORDER BY start_time DESC;

-- Get active conversations (not ended)
-- SELECT * FROM conversations
-- WHERE end_time IS NULL
-- ORDER BY start_time DESC;

-- Delete old conversations (older than 90 days)
-- DELETE FROM conversations
-- WHERE start_time < NOW() - INTERVAL '90 days';

-- =============================================================================
-- SETUP COMPLETE!
-- =============================================================================

SELECT 'Supabase setup complete! ✅' as status,
       'conversations table created with indexes' as details;
