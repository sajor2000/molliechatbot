import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseDatabaseService } from '../../src/services/supabase-database.service';

// Import the shared sessions map
// Note: In production, use Vercel KV or Redis for session persistence
const activeSessions = new Map();

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const conversation = activeSessions.get(sessionId);

    if (conversation) {
      conversation.endTime = new Date();
      await supabaseDatabaseService.saveConversation(conversation);
      activeSessions.delete(sessionId);
    }

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
