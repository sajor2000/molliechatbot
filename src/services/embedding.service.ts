import { openaiService } from './openai.service';
import { cacheService } from './cache.service';
import { logger } from './logger.service';
import { EmbeddingRequest, EmbeddingBatchRequest, EmbeddingResult, EmbeddingBatchResult } from '../types/api.types';

/**
 * Embedding Service
 * Centralized service for generating embeddings with caching and batch processing
 * Eliminates code duplication across upload endpoints
 */

export class EmbeddingService {
  /**
   * Generate single embedding with optional caching
   */
  async generateEmbedding(request: EmbeddingRequest): Promise<EmbeddingResult> {
    const { text, useCache = true } = request;

    // Check cache first if enabled
    if (useCache) {
      const cached = await cacheService.getCachedEmbedding(text);
      if (cached) {
        logger.cache(true, `embedding:${text.substring(0, 50)}`);
        return {
          embedding: cached,
          cached: true,
        };
      }
    }

    // Generate new embedding
    logger.debug('Generating new embedding', { textLength: text.length });
    const embedding = await openaiService.createEmbedding(text);

    // Cache the result if enabled
    if (useCache) {
      await cacheService.cacheEmbedding(text, embedding);
    }

    return {
      embedding,
      cached: false,
    };
  }

  /**
   * Generate embeddings in parallel batches for optimal performance
   * Replaces sequential generation with artificial delays
   */
  async generateBatch(request: EmbeddingBatchRequest): Promise<EmbeddingBatchResult> {
    const { texts, useCache = true } = request;
    const batchSize = 5; // Process 5 embeddings concurrently
    const results: number[][] = [];
    let cachedCount = 0;
    let generatedCount = 0;

    logger.info(`Generating embeddings for ${texts.length} chunks`, {
      batchSize,
      useCache,
    });

    // Process in batches to avoid rate limits
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);
      const startTime = Date.now();

      // Generate all embeddings in this batch concurrently
      const batchResults = await Promise.all(
        batch.map(async (text) => {
          const result = await this.generateEmbedding({ text, useCache });
          if (result.cached) {
            cachedCount++;
          } else {
            generatedCount++;
          }
          return result.embedding;
        })
      );

      results.push(...batchResults);

      const duration = Date.now() - startTime;
      logger.performance(`Batch ${Math.floor(i / batchSize) + 1}`, duration, {
        batchSize: batch.length,
        cached: cachedCount,
        generated: generatedCount,
      });

      // Small delay between batches to respect rate limits (100ms instead of 200ms)
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    logger.success(`Generated ${texts.length} embeddings`, {
      cachedCount,
      generatedCount,
      total: texts.length,
    });

    return {
      embeddings: results,
      cachedCount,
      generatedCount,
    };
  }

  /**
   * Generate embeddings with progress callback
   * Useful for long-running document processing
   */
  async generateBatchWithProgress(
    texts: string[],
    onProgress: (current: number, total: number, cached: boolean) => void,
    useCache: boolean = true
  ): Promise<EmbeddingBatchResult> {
    const results: number[][] = [];
    let cachedCount = 0;
    let generatedCount = 0;
    const batchSize = 5;

    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      const batchResults = await Promise.all(
        batch.map(async (text, idx) => {
          const result = await this.generateEmbedding({ text, useCache });
          if (result.cached) {
            cachedCount++;
          } else {
            generatedCount++;
          }

          // Call progress callback
          onProgress(i + idx + 1, texts.length, result.cached);

          return result.embedding;
        })
      );

      results.push(...batchResults);

      // Small delay between batches
      if (i + batchSize < texts.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    return {
      embeddings: results,
      cachedCount,
      generatedCount,
    };
  }

  /**
   * Estimate cost for generating embeddings
   * Based on OpenAI text-embedding-3-large pricing: $0.13 per 1M tokens
   */
  estimateCost(texts: string[]): {
    estimatedTokens: number;
    estimatedCost: number;
    estimatedTimeSeconds: number;
  } {
    // Rough estimate: 1 token ≈ 4 characters
    const totalChars = texts.reduce((sum, text) => sum + text.length, 0);
    const estimatedTokens = Math.ceil(totalChars / 4);
    const estimatedCost = (estimatedTokens / 1000000) * 0.13; // $0.13 per 1M tokens

    // Estimate time: ~200ms per embedding + batching overhead
    const batchCount = Math.ceil(texts.length / 5);
    const estimatedTimeSeconds = (texts.length * 0.2) + (batchCount * 0.1);

    return {
      estimatedTokens,
      estimatedCost: Math.round(estimatedCost * 100) / 100, // Round to 2 decimals
      estimatedTimeSeconds: Math.round(estimatedTimeSeconds),
    };
  }
}

export const embeddingService = new EmbeddingService();
