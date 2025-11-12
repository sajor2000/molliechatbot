import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { pineconeService } from '../../src/services/pinecone.service';
import { openaiService } from '../../src/services/openai.service';
import { cohereService } from '../../src/services/cohere.service';
import { cacheService } from '../../src/services/cache.service';
import { streamingService } from '../../src/services/streaming.service';
import { supabaseDatabaseService } from '../../src/services/supabase-database.service';
import { logger } from '../../src/services/logger.service';
import { ChatMessage, Conversation } from '../../src/types';
import { PineconeMatch, RAGMatch, CohereRerankResult, CohereDocument } from '../../src/types/api.types';
import { getBusinessHoursMessage } from '../../src/utils/business-hours';
import { kvSessionService } from '../../src/services/kv-session.service';
import { rateLimitChat } from '../../src/middleware/rate-limit.middleware';
import { validateChatMessage } from '../../src/middleware/validation.middleware';
import { corsMiddleware } from '../../src/middleware/cors.middleware';
import { createErrorHandler, addBreadcrumb } from '../../src/services/sentry.service';

async function handler(req: VercelRequest, res: VercelResponse): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  // Get or create session ID (needs to be outside try-catch for error handler)
  const { message, sessionId } = req.body;
  const convId = sessionId || uuidv4();

  try {
    if (!message) {
      res.status(400).json({ error: 'Message is required' });
      return;
    }

    // Get or create conversation from KV storage
    let conversation = await kvSessionService.getSession(convId);

    if (!conversation) {
      conversation = {
        id: convId,
        messages: [],
        startTime: new Date(),
        metadata: {
          userAgent: req.headers['user-agent'] as string,
          ipAddress: req.headers['x-forwarded-for'] as string || req.headers['x-real-ip'] as string,
          sessionId: convId,
        },
      };
    }

    // Add user message
    const userMessage: ChatMessage = {
      role: 'user',
      content: message,
      timestamp: new Date(),
    };
    conversation.messages.push(userMessage);

    // Save user message to Supabase immediately (per-turn persistence)
    await supabaseDatabaseService.saveChatMessage({
      sessionId: convId,
      role: 'user',
      content: message,
      createdAt: userMessage.timestamp,
    });

    // Check cache first for query result
    const cachedResult = await cacheService.getCachedQueryResult(message);
    if (cachedResult) {
      logger.cache(true, `query:${message.substring(0, 50)}`);
      addBreadcrumb('Cache hit - returning cached response', { sessionId: convId }, 'cache', 'info');

      // Save cached assistant response to Supabase (per-turn persistence)
      const cachedAssistantMessage: ChatMessage = {
        role: 'assistant',
        content: cachedResult.response,
        timestamp: new Date(),
      };
      await supabaseDatabaseService.saveChatMessage({
        sessionId: convId,
        role: 'assistant',
        content: cachedResult.response,
        createdAt: cachedAssistantMessage.timestamp,
      });

      res.setHeader('X-Session-ID', convId);
      res.status(200).json({
        ...cachedResult,
        cached: true,
        sessionId: convId,
      });
      return;
    }
    addBreadcrumb('Cache miss - performing RAG query', { sessionId: convId, messageLength: message.length }, 'cache', 'info');

    // RAG BEST PRACTICE 1: Create embedding and query Pinecone for context
    const embedding = await openaiService.createEmbedding(message);
    const contextMatches = await pineconeService.queryEmbeddings(embedding, 10); // Get more candidates for reranking

    // Log top similarity scores for debugging
    if (contextMatches.length > 0) {
      logger.rag('Top similarity scores', {
        chunks: contextMatches.length,
        similarityScore: contextMatches[0]?.score
      });
    }

    // RAG BEST PRACTICE 2: Similarity threshold filtering (prevent irrelevant results)
    const SIMILARITY_THRESHOLD = 0.60; // Lowered to retrieve more relevant context for reranking
    const relevantMatches = contextMatches.filter(
      (match: PineconeMatch): boolean => (match.score ?? 0) >= SIMILARITY_THRESHOLD
    );

    logger.rag(`Retrieved chunks: ${contextMatches.length}, relevant: ${relevantMatches.length}`, {
      chunks: contextMatches.length,
      similarityScore: relevantMatches[0]?.score,
      reranked: false
    });
    addBreadcrumb('Vector search completed', {
      chunksRetrieved: contextMatches.length,
      chunksRelevant: relevantMatches.length,
      threshold: SIMILARITY_THRESHOLD
    }, 'rag', 'info');

    // RAG BEST PRACTICE 3: Cohere Reranking for improved context selection
    let finalMatches: RAGMatch[] = relevantMatches as RAGMatch[];
    if (relevantMatches.length > 0) {
      const documentsToRerank: CohereDocument[] = relevantMatches.map((match: PineconeMatch) => ({
        text: match.metadata?.text || '',
        metadata: match.metadata,
      }));

      const rerankedResults: CohereRerankResult[] = await cohereService.rerank(message, documentsToRerank, 3);

      finalMatches = rerankedResults.map((result: CohereRerankResult): RAGMatch => {
        const originalMatch = relevantMatches[result.index];
        return {
          id: originalMatch.id,
          score: result.relevanceScore,
          metadata: originalMatch.metadata,
        };
      });

      logger.rag(`Reranked to top 3`, {
        chunks: rerankedResults.length,
        similarityScore: rerankedResults[0]?.relevanceScore,
        reranked: true
      });
      addBreadcrumb('Cohere reranking completed', {
        topScore: rerankedResults[0]?.relevanceScore,
        resultsCount: rerankedResults.length
      }, 'rag', 'info');
    }

    // RAG BEST PRACTICE 4: Build structured context from reranked chunks
    const context: string = finalMatches.length > 0
      ? finalMatches
          .map((match: RAGMatch) => match.metadata?.text || '')
          .join('\n\n')
      : ''; // Empty context if no relevant results

    // RAG BEST PRACTICE 5: Stream response with incremental delivery
    const { stream, fullResponsePromise } = streamingService.createChatStream(
      conversation.messages,
      context
    );

    // Set SSE headers for streaming
    const headers = streamingService.setStreamingHeaders({
      'X-Session-ID': convId,
    });

    Object.entries(headers).forEach(([key, value]) => {
      res.setHeader(key, value);
    });

    // Start streaming response to client
    res.status(200);
    (res as any).flushHeaders?.();

    // Pipe the stream to response
    const reader = stream.getReader();
    const pump = async (): Promise<void> => {
      const { done, value } = await reader.read();
      if (done) {
        res.end();
        return;
      }
      res.write(Buffer.from(value));
      return pump();
    };

    // Start pumping and handle completion in background
    pump().catch((error) => {
      logger.error('Stream pump error', error);
      res.end();
    });

    // Wait for full response to save and cache (runs in background)
    fullResponsePromise.then(async (aiResponse) => {
      // Add assistant message
      const assistantMessage: ChatMessage = {
        role: 'assistant',
        content: aiResponse,
        timestamp: new Date(),
      };
      conversation.messages.push(assistantMessage);

      // Save assistant message to Supabase immediately (per-turn persistence)
      await supabaseDatabaseService.saveChatMessage({
        sessionId: convId,
        role: 'assistant',
        content: aiResponse,
        createdAt: assistantMessage.timestamp,
      });

      // Save conversation to KV storage with 1-hour TTL
      await kvSessionService.setSession(convId, conversation);

      // Calculate confidence metrics
      const avgScore: number = finalMatches.length > 0
        ? finalMatches.reduce((sum: number, m: RAGMatch) => sum + m.score, 0) / finalMatches.length
        : 0;

      const responseData = {
        response: aiResponse,
        sessionId: convId,
        confidence: {
          score: avgScore,
          chunksUsed: finalMatches.length,
          chunksRetrieved: contextMatches.length,
          hasContext: finalMatches.length > 0,
          reranked: relevantMatches.length > 0,
        },
        cached: false,
      };

      // Cache the response for future identical queries
      await cacheService.cacheQueryResult(message, responseData);
    }).catch((error) => {
      logger.error('Error saving streamed response', error);
    });

    return;
  } catch (error) {
    logger.error('Error in chat webhook', error);

    // Provide user-friendly error messages (don't expose internals)
    const userMessage = error instanceof Error &&
      (error.message.includes('API key') ||
       error.message.includes('rate limit') ||
       error.message.includes('temporarily unavailable'))
      ? error.message
      : 'Sorry, I encountered an error. Please try again.';

    res.status(500).json({
      error: userMessage,
      sessionId: convId,
      canRetry: true
    });
  }
}

// Apply middleware: CORS, validation, rate limiting, and error tracking
const wrappedHandler = createErrorHandler(handler);
export default corsMiddleware(validateChatMessage(rateLimitChat(wrappedHandler)));

// Configure API route
export const config = {
  maxDuration: 30, // 30 seconds for chat responses
};
