/**
 * API Type Definitions
 * Comprehensive type safety for external API responses and internal data structures
 */

// ============================================================================
// OpenAI API Types
// ============================================================================

export interface OpenAIEmbeddingPayload {
  model: string;
  input: string;
  dimensions?: number;
}

export interface OpenAIEmbeddingResponse {
  object: 'list';
  data: Array<{
    object: 'embedding';
    embedding: number[];
    index: number;
  }>;
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface OpenAIChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OpenAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: 'assistant';
      content: string;
    };
    finish_reason: 'stop' | 'length' | 'content_filter' | null;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

// ============================================================================
// Pinecone API Types
// ============================================================================

export interface PineconeMetadata {
  text: string;
  source: string;
  chunkIndex?: number;
  totalChunks?: number;
  pageNumber?: number;
  documentType?: string;
  filename?: string;
  [key: string]: string | number | boolean | undefined;
}

export interface PineconeVector {
  id: string;
  values: number[];
  metadata?: PineconeMetadata;
}

export interface PineconeMatch {
  id: string;
  score: number;
  values?: number[];
  metadata?: PineconeMetadata;
}

export interface PineconeQueryResponse {
  matches: PineconeMatch[];
  namespace?: string;
}

export interface PineconeUpsertRequest {
  vectors: PineconeVector[];
  namespace?: string;
}

export interface PineconeUpsertResponse {
  upsertedCount: number;
}

// ============================================================================
// Cohere API Types
// ============================================================================

export interface CohereDocument {
  text: string;
  metadata?: PineconeMetadata;
}

export interface CohereRerankResult {
  index: number;
  relevanceScore: number;
  document?: CohereDocument;
}

export interface CohereRerankResponse {
  id: string;
  results: CohereRerankResult[];
  meta: {
    api_version: {
      version: string;
    };
    billed_units?: {
      search_units: number;
    };
  };
}

// ============================================================================
// RAG Pipeline Types
// ============================================================================

export interface RAGContext {
  text: string;
  source: string;
  score: number;
  chunkIndex?: number;
  pageNumber?: number;
}

export interface RAGQueryResult {
  response: string;
  sessionId: string;
  confidence: {
    score: number;
    chunksUsed: number;
    chunksRetrieved: number;
    hasContext: boolean;
    reranked: boolean;
  };
  cached: boolean;
}

export interface RAGMatch {
  id: string;
  score: number;
  metadata?: PineconeMetadata;
}

// ============================================================================
// Chat API Types
// ============================================================================

export interface ChatWebhookRequest {
  message: string;
  sessionId?: string;
}

export interface ChatWebhookResponse {
  response?: string;
  sessionId: string;
  confidence?: {
    score: number;
    chunksUsed: number;
    chunksRetrieved: number;
    hasContext: boolean;
    reranked: boolean;
  };
  cached: boolean;
  error?: string;
  canRetry?: boolean;
}

// ============================================================================
// Document Upload Types
// ============================================================================

export interface DocumentUploadRequest {
  filename: string;
  fileSize?: number;
}

export interface DocumentUploadResponse {
  success: boolean;
  filename: string;
  chunks: number;
  vectors: number;
  message: string;
  error?: string;
}

export interface DocumentProcessingStats {
  filename: string;
  chunks: number;
  vectors: number;
  size: number;
  processingTime: number;
}

// ============================================================================
// Cache Types
// ============================================================================

export interface CacheStats {
  hits: number;
  misses: number;
}

export interface CachedQueryResult {
  response: string;
  sessionId: string;
  confidence: {
    score: number;
    chunksUsed: number;
    chunksRetrieved: number;
    hasContext: boolean;
    reranked: boolean;
  };
  cached: boolean;
}

// ============================================================================
// Streaming Types
// ============================================================================

export interface StreamChunk {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
}

export interface StreamResponse {
  stream: ReadableStream<Uint8Array>;
  fullResponsePromise: Promise<string>;
}

// ============================================================================
// Error Types
// ============================================================================

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500,
    public code?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export class ValidationError extends APIError {
  constructor(message: string) {
    super(message, 400, 'VALIDATION_ERROR');
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends APIError {
  constructor(message: string = 'Rate limit exceeded') {
    super(message, 429, 'RATE_LIMIT_ERROR');
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends APIError {
  constructor(message: string = 'Authentication failed') {
    super(message, 401, 'AUTH_ERROR');
    this.name = 'AuthenticationError';
  }
}

export class ExternalAPIError extends APIError {
  constructor(
    message: string,
    public service: 'openai' | 'pinecone' | 'cohere' | 'supabase',
    public originalError?: Error
  ) {
    super(message, 502, 'EXTERNAL_API_ERROR');
    this.name = 'ExternalAPIError';
  }
}

// ============================================================================
// Embedding Service Types
// ============================================================================

export interface EmbeddingRequest {
  text: string;
  useCache?: boolean;
}

export interface EmbeddingBatchRequest {
  texts: string[];
  useCache?: boolean;
}

export interface EmbeddingResult {
  embedding: number[];
  cached: boolean;
}

export interface EmbeddingBatchResult {
  embeddings: number[][];
  cachedCount: number;
  generatedCount: number;
}

// ============================================================================
// Type Guards
// ============================================================================

export function isPineconeMatch(obj: unknown): obj is PineconeMatch {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'id' in obj &&
    'score' in obj &&
    typeof (obj as PineconeMatch).score === 'number'
  );
}

export function isRAGMatch(obj: unknown): obj is RAGMatch {
  return isPineconeMatch(obj);
}

export function isCohereRerankResult(obj: unknown): obj is CohereRerankResult {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    'index' in obj &&
    'relevanceScore' in obj &&
    typeof (obj as CohereRerankResult).relevanceScore === 'number'
  );
}
