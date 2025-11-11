import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { pineconeService } from '../services/pinecone.service';
import { openrouterService } from '../services/openrouter.service';
import { storageService } from '../services/storage.service';
import { schedulerService } from '../services/scheduler.service';
import { ChatMessage, Conversation } from '../types';

const router = Router();

// In-memory session storage (use Redis in production)
const activeSessions = new Map<string, Conversation>();

// Webhook endpoint for chat messages
router.post('/webhook', async (req: Request, res: Response) => {
  try {
    const { message, sessionId } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    // Get or create session
    const convId = sessionId || uuidv4();
    let conversation = activeSessions.get(convId);

    if (!conversation) {
      conversation = {
        id: convId,
        messages: [],
        startTime: new Date(),
        metadata: {
          userAgent: req.headers['user-agent'],
          ipAddress: req.ip,
          sessionId: convId,
        },
      };
      activeSessions.set(convId, conversation);
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    conversation.messages.push(userMessage);

    // Create embedding and query Pinecone for context
    const embedding = await openrouterService.createEmbedding(message);
    const contextMatches = await pineconeService.queryEmbeddings(embedding, 3);

    const context = contextMatches
      .map((match: any) => match.metadata?.text || '')
      .join('\n\n');

    // Generate response with RAG context
    const aiResponse = await openrouterService.chat(conversation.messages, context);

    // Add assistant message
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
    };
    conversation.messages.push(assistantMessage);

    // Update session
    activeSessions.set(convId, conversation);

    res.json({
      response: aiResponse,
      sessionId: convId,
      context: contextMatches.length > 0 ? `Used ${contextMatches.length} knowledge base entries` : 'No context found',
    });
  } catch (error) {
    console.error('Error in chat webhook:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// End conversation endpoint
router.post('/end-session', async (req: Request, res: Response) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const conversation = activeSessions.get(sessionId);

    if (conversation) {
      conversation.endTime = new Date();
      await storageService.saveConversation(conversation);
      activeSessions.delete(sessionId);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Error ending session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Manual trigger for daily summary (for testing)
router.post('/trigger-summary', async (req: Request, res: Response) => {
  try {
    await schedulerService.triggerManual();
    res.json({ success: true, message: 'Daily summary triggered' });
  } catch (error) {
    console.error('Error triggering summary:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
router.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
