import { v4 as uuidv4 } from 'uuid';
import { Ratelimit } from '@upstash/ratelimit';
import { kv } from '@vercel/kv';
import { pineconeService } from '../../src/services/pinecone.service';
import { openaiService } from '../../src/services/openai.service';
import { cohereService } from '../../src/services/cohere.service';
import { cacheService } from '../../src/services/cache.service';
import { streamingService } from '../../src/services/streaming.service';
import { supabaseDatabaseService } from '../../src/services/supabase-database.service';
import { kvSessionService } from '../../src/services/kv-session.service';
import { sanitizeString, validateMessageLength, validateSessionId } from '../../src/middleware/validation.middleware';
import { ChatMessage } from '../../src/types';
import { PineconeMatch, RAGMatch, CohereRerankResult, CohereDocument, PineconeMetadata } from '../../src/types/api.types';

export const config = {
  runtime: 'edge',
};

const SIMILARITY_THRESHOLD = 0.6;
const EXPOSE_HEADERS = 'X-Session-ID, X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset';

const chatRateLimiter = new Ratelimit({
  redis: kv,
  limiter: Ratelimit.slidingWindow(30, '1 m'),
  analytics: true,
  prefix: 'ratelimit:chat',
});

interface ChatRequestBody {
  message: string;
  sessionId?: string;
}

type PendingHistoryEntry = {
  sessionId: string;
  role: ChatMessage['role'];
  content: string;
  createdAt?: Date;
};

export default async function handler(req: Request): Promise<Response> {
  const allowedOrigins = getAllowedOrigins();
  const origin = req.headers.get('origin');
  const corsHeaders = getCorsHeaders(origin, allowedOrigins);

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        ...corsHeaders,
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-API-Key, X-Session-ID',
        'Access-Control-Max-Age': '86400',
      },
    });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  const rateLimitResult = await applyRateLimit(req);
  const rateLimitHeaders = rateLimitResult.headers;

  if (!rateLimitResult.success) {
    return jsonResponse({
      error: 'Too many requests',
      message: 'You are sending messages too quickly. Please slow down.',
      retryAfter: rateLimitResult.retryAfter,
    }, 429, {
      ...corsHeaders,
      ...rateLimitHeaders,
    });
  }

  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch (error) {
    return jsonResponse({
      error: 'Bad request',
      message: 'Invalid JSON payload',
    }, 400, {
      ...corsHeaders,
      ...rateLimitHeaders,
    });
  }

  const { message, sessionId } = body;

  if (!message || typeof message !== 'string') {
    return jsonResponse({
      error: 'Bad request',
      message: 'Message is required and must be a string',
    }, 400, {
      ...corsHeaders,
      ...rateLimitHeaders,
    });
  }

  if (!validateMessageLength(message)) {
    return jsonResponse({
      error: 'Bad request',
      message: 'Message exceeds maximum length',
    }, 400, {
      ...corsHeaders,
      ...rateLimitHeaders,
    });
  }

  if (sessionId && !validateSessionId(sessionId)) {
    return jsonResponse({
      error: 'Bad request',
      message: 'Invalid session ID format',
    }, 400, {
      ...corsHeaders,
      ...rateLimitHeaders,
    });
  }

  const sanitizedMessage = sanitizeString(message);
  const convId = sessionId || uuidv4();
  const historyBuffer: PendingHistoryEntry[] = [];

  const queueHistory = (entry: PendingHistoryEntry) => {
    historyBuffer.push(entry);
  };

  const flushHistory = async () => {
    if (!historyBuffer.length) {
      return;
    }

    const entries = historyBuffer.splice(0, historyBuffer.length);
    await supabaseDatabaseService.saveChatMessages(entries);
  };

  try {
    let conversation = await kvSessionService.getSession(convId);

    if (!conversation) {
      conversation = {
        id: convId,
        messages: [],
        startTime: new Date(),
        metadata: {
          userAgent: req.headers.get('user-agent') || '',
          ipAddress: getClientIdentifier(req.headers),
          sessionId: convId,
        },
      };
    }

    const userMessage: ChatMessage = {
      role: 'user',
      content: sanitizedMessage,
      timestamp: new Date(),
    };
    conversation.messages.push(userMessage);
    queueHistory({
      sessionId: convId,
      role: 'user',
      content: sanitizedMessage,
      createdAt: userMessage.timestamp,
    });

    const cachedResult = await cacheService.getCachedQueryResult(sanitizedMessage);
    if (cachedResult) {
      queueHistory({
        sessionId: convId,
        role: 'assistant',
        content: cachedResult.response,
        createdAt: new Date(),
      });

      await flushHistory().catch(error => {
        console.error('Error saving cached conversation history', error);
      });

      return jsonResponse(
        {
          ...cachedResult,
          cached: true,
          sessionId: convId,
        },
        200,
        {
          ...corsHeaders,
          ...rateLimitHeaders,
          'X-Session-ID': convId,
          'Access-Control-Expose-Headers': EXPOSE_HEADERS,
        },
      );
    }

    const embedding = await openaiService.createEmbedding(sanitizedMessage);
    const contextMatches = await pineconeService.queryEmbeddings(embedding, 10);

    const relevantMatches = contextMatches.filter((match: PineconeMatch) => {
      return (match.score ?? 0) >= SIMILARITY_THRESHOLD;
    });

    let finalMatches: RAGMatch[] = relevantMatches as RAGMatch[];

    if (relevantMatches.length > 0) {
      const documentsToRerank: CohereDocument[] = relevantMatches.map((match: PineconeMatch) => ({
        text: match.metadata?.text || '',
        metadata: match.metadata,
      }));

      const rerankedResults: CohereRerankResult[] = await cohereService.rerank(
        sanitizedMessage,
        documentsToRerank,
        3
      );

      finalMatches = rerankedResults.map((result: CohereRerankResult): RAGMatch => {
        const originalMatch = relevantMatches[result.index];
        const fallbackMetadata = documentsToRerank[result.index]?.metadata;
        return {
          id: originalMatch?.id || `rerank-${result.index}`,
          score: result.relevanceScore,
          metadata: (originalMatch?.metadata || fallbackMetadata) as PineconeMetadata | undefined,
        };
      });
    }

    const context: string = finalMatches.length > 0
      ? finalMatches.map(match => match.metadata?.text || '').join('\n\n')
      : '';

    const { stream, fullResponsePromise } = streamingService.createChatStream(
      conversation.messages,
      context
    );

    const streamingHeaders = streamingService.setStreamingHeaders({
      ...corsHeaders,
      ...rateLimitHeaders,
      'X-Session-ID': convId,
      'Access-Control-Expose-Headers': EXPOSE_HEADERS,
    });

    const response = new Response(stream, {
      status: 200,
      headers: streamingHeaders,
    });

    fullResponsePromise
      .then(async (aiResponse) => {
        const assistantMessage: ChatMessage = {
          role: 'assistant',
          content: aiResponse,
          timestamp: new Date(),
        };

        conversation.messages.push(assistantMessage);
        queueHistory({
          sessionId: convId,
          role: 'assistant',
          content: aiResponse,
          createdAt: assistantMessage.timestamp,
        });

        await flushHistory().catch(error => {
          console.error('Error saving streamed conversation history', error);
        });

        await kvSessionService.setSession(convId, conversation);

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

        await cacheService.cacheQueryResult(sanitizedMessage, responseData);
      })
      .catch((error) => {
        console.error('Error finalizing streamed response', error);
      });

    return response;
  } catch (error) {
    console.error('Error in chat webhook', error);
    await flushHistory().catch(err => {
      console.error('Error flushing pending chat history', err);
    });

    return jsonResponse({
      error: error instanceof Error ? error.message : 'Failed to process request',
      sessionId: convId,
      canRetry: true,
    }, 500, {
      ...corsHeaders,
      ...rateLimitHeaders,
      'X-Session-ID': convId,
      'Access-Control-Expose-Headers': EXPOSE_HEADERS,
    });
  }
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  headers: Record<string, string> = {}
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
  });
}

function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  if (!envOrigins) {
    return process.env.NODE_ENV === 'production' ? [] : ['*'];
  }

  return envOrigins.split(',').map(origin => origin.trim());
}

function isOriginAllowed(origin: string | null, allowedOrigins: string[]): boolean {
  if (!origin) {
    return false;
  }

  if (allowedOrigins.includes('*')) {
    if (process.env.NODE_ENV === 'production') {
      console.error('🔴 SECURITY ERROR: ALLOWED_ORIGINS=* is forbidden in production');
      return false;
    }
    return true;
  }

  if (allowedOrigins.includes(origin)) {
    return true;
  }

  return allowedOrigins.some((allowed) => {
    if (!allowed.startsWith('*.')) {
      return false;
    }
    const domain = allowed.substring(2);
    return origin.endsWith(domain);
  });
}

function getCorsHeaders(origin: string | null, allowedOrigins: string[]): Record<string, string> {
  const headers: Record<string, string> = { 'Vary': 'Origin' };

  if (origin && isOriginAllowed(origin, allowedOrigins)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Credentials'] = 'true';
    headers['Access-Control-Expose-Headers'] = EXPOSE_HEADERS;
  }

  return headers;
}

async function applyRateLimit(req: Request): Promise<{
  success: boolean;
  headers: Record<string, string>;
  retryAfter?: number;
}> {
  const identifier = getClientIdentifier(req.headers);
  const { success, limit, reset, remaining } = await chatRateLimiter.limit(identifier);

  const headers: Record<string, string> = {
    'X-RateLimit-Limit': limit.toString(),
    'X-RateLimit-Remaining': remaining.toString(),
    'X-RateLimit-Reset': new Date(reset).toISOString(),
  };

  let retryAfter: number | undefined;

  if (!success) {
    retryAfter = Math.ceil((reset - Date.now()) / 1000);
    headers['Retry-After'] = retryAfter.toString();
  }

  return { success, headers, retryAfter };
}

function getClientIdentifier(headers: Headers): string {
  const forwardedFor = headers.get('x-forwarded-for');
  const realIp = headers.get('x-real-ip');

  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  if (realIp) {
    return realIp;
  }

  return 'unknown';
}
