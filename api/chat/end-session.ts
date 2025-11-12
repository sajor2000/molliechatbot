import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseDatabaseService } from '../../src/services/supabase-database.service';
import { kvSessionService } from '../../src/services/kv-session.service';
import { createErrorHandler } from '../../src/services/sentry.service';

async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    // Retrieve and end session from KV storage
    const conversation = await kvSessionService.endSession(sessionId);

    if (conversation) {
      // Save to Supabase for permanent storage
      await supabaseDatabaseService.saveConversation(conversation);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);

    // Hide internal error details in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        error: 'Failed to end session'
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Apply error tracking
export default createErrorHandler(handler);
