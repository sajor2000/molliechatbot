import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import { pineconeService } from '../../src/services/pinecone.service';
import { openaiService } from '../../src/services/openai.service';
import { cohereService } from '../../src/services/cohere.service';
import { cacheService } from '../../src/services/cache.service';
import { ChatMessage, Conversation } from '../../src/types';
import { getBusinessHoursMessage } from '../../src/utils/business-hours';
import { kvSessionService } from '../../src/services/kv-session.service';
import { rateLimitChat } from '../../src/middleware/rate-limit.middleware';
import { validateChatMessage } from '../../src/middleware/validation.middleware';
import { corsMiddleware } from '../../src/middleware/cors.middleware';

async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Get or create session ID (needs to be outside try-catch for error handler)
  const { message, sessionId } = req.body;
  const convId = sessionId || uuidv4();

  try {
    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
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

    // Check cache first for query result
    const cachedResult = await cacheService.getCachedQueryResult(message);
    if (cachedResult) {
      console.log('✅ Using cached response');
      return res.status(200).json({
        ...cachedResult,
        cached: true,
        sessionId: convId,
      });
    }

    // RAG BEST PRACTICE 1: Create embedding and query Pinecone for context
    const embedding = await openaiService.createEmbedding(message);
    const contextMatches = await pineconeService.queryEmbeddings(embedding, 10); // Get more candidates for reranking

    // Log top similarity scores for debugging
    if (contextMatches.length > 0) {
      console.log('🔍 Top similarity scores:',
        contextMatches.slice(0, 3).map((m: any) => ({
          score: m.score?.toFixed(3),
          source: m.metadata?.source?.substring(0, 50),
          preview: m.metadata?.text?.substring(0, 80) + '...'
        }))
      );
    }

    // RAG BEST PRACTICE 2: Similarity threshold filtering (prevent irrelevant results)
    const SIMILARITY_THRESHOLD = 0.60; // Lowered to retrieve more relevant context for reranking
    const relevantMatches = contextMatches.filter(
      (match: any) => match.score >= SIMILARITY_THRESHOLD
    );

    console.log(`📊 Retrieved ${contextMatches.length} chunks, ${relevantMatches.length} above threshold (${SIMILARITY_THRESHOLD})`);

    // RAG BEST PRACTICE 3: Cohere Reranking for improved context selection
    let finalMatches = relevantMatches;
    if (relevantMatches.length > 0) {
      const documentsToRerank = relevantMatches.map((match: any) => ({
        text: match.metadata?.text || '',
        metadata: match.metadata,
      }));

      const rerankedResults = await cohereService.rerank(message, documentsToRerank, 3);

      finalMatches = rerankedResults.map(result => {
        const originalMatch = relevantMatches[result.index];
        return {
          id: originalMatch.id,
          score: result.relevanceScore,
          values: originalMatch.values,
          metadata: result.document.metadata,
        };
      });

      console.log(`🎯 Reranked to top 3. Best relevance score: ${rerankedResults[0]?.relevanceScore.toFixed(3)}`);
    }

    // RAG BEST PRACTICE 4: Build structured context from reranked chunks
    const context = finalMatches.length > 0
      ? finalMatches
          .map((match: any) => match.metadata?.text || '')
          .join('\n\n')
      : ''; // Empty context if no relevant results

    // Generate response with RAG context (or without if no relevant context found)
    const aiResponse = await openaiService.chat(conversation.messages, context);

    // Add assistant message
    const assistantMessage: ChatMessage = {
      role: 'assistant',
      content: aiResponse,
      timestamp: new Date(),
    };
    conversation.messages.push(assistantMessage);

    // Save conversation to KV storage with 1-hour TTL
    await kvSessionService.setSession(convId, conversation);

    // RAG BEST PRACTICE 5: Return confidence information with reranking scores
    const avgScore = finalMatches.length > 0
      ? finalMatches.reduce((sum: number, m: any) => sum + m.score, 0) / finalMatches.length
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

    return res.status(200).json(responseData);
  } catch (error) {
    console.error('Error in chat webhook:', error);

    // Provide user-friendly error messages (don't expose internals)
    const userMessage = error instanceof Error &&
      (error.message.includes('API key') ||
       error.message.includes('rate limit') ||
       error.message.includes('temporarily unavailable'))
      ? error.message
      : 'Sorry, I encountered an error. Please try again.';

    return res.status(500).json({
      error: userMessage,
      sessionId: convId,
      canRetry: true
    });
  }
}

// Apply middleware: CORS, validation, and rate limiting
export default corsMiddleware(validateChatMessage(rateLimitChat(handler)));

// Configure API route
export const config = {
  maxDuration: 30, // 30 seconds for chat responses
};
