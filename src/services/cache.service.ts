import { kv } from '@vercel/kv';

/**
 * Cache Service using Vercel KV
 * Caches RAG query results and embeddings to improve performance and reduce API costs
 */

const CACHE_PREFIX = 'cache:';
const QUERY_CACHE_TTL = 3600; // 1 hour
const EMBEDDING_CACHE_TTL = 86400 * 7; // 7 days

export class CacheService {
  /**
   * Generate cache key from query string
   */
  private generateCacheKey(prefix: string, query: string): string {
    const hash = this.hashString(query);
    return `${CACHE_PREFIX}${prefix}:${hash}`;
  }

  /**
   * Lightweight, runtime-agnostic hash (cyrb53) to avoid Node crypto dependency
   */
  private hashString(value: string): string {
    let h1 = 0xdeadbeef ^ value.length;
    let h2 = 0x41c6ce57 ^ value.length;

    for (let i = 0; i < value.length; i++) {
      const ch = value.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }

    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);

    return ((h2 >>> 0).toString(16).padStart(8, '0') + (h1 >>> 0).toString(16).padStart(8, '0')).toLowerCase();
  }

  /**
   * Cache RAG query result
   */
  async cacheQueryResult(query: string, result: any): Promise<void> {
    try {
      const key = this.generateCacheKey('query', query);
      await kv.set(key, result, { ex: QUERY_CACHE_TTL });
      console.log(`✅ Cached query result: ${key}`);
    } catch (error) {
      console.error('❌ Error caching query result:', error);
      // Don't throw - caching failures shouldn't break the app
    }
  }

  /**
   * Get cached RAG query result
   */
  async getCachedQueryResult(query: string): Promise<any | null> {
    try {
      const key = this.generateCacheKey('query', query);
      const cached = await kv.get(key);

      if (cached) {
        console.log(`✅ Cache hit for query: ${key}`);
        await this.incrementCacheHit(); // Track cache hits
        return cached;
      }

      console.log(`⚠️ Cache miss for query: ${key}`);
      await this.incrementCacheMiss(); // Track cache misses
      return null;
    } catch (error) {
      console.error('❌ Error getting cached query result:', error);
      return null;
    }
  }

  /**
   * Cache embedding vector
   */
  async cacheEmbedding(text: string, embedding: number[]): Promise<void> {
    try {
      const key = this.generateCacheKey('embedding', text);
      await kv.set(key, embedding, { ex: EMBEDDING_CACHE_TTL });
      console.log(`✅ Cached embedding: ${key}`);
    } catch (error) {
      console.error('❌ Error caching embedding:', error);
    }
  }

  /**
   * Get cached embedding vector
   */
  async getCachedEmbedding(text: string): Promise<number[] | null> {
    try {
      const key = this.generateCacheKey('embedding', text);
      const cached = await kv.get<number[]>(key);

      if (cached) {
        console.log(`✅ Cache hit for embedding: ${key}`);
        await this.incrementCacheHit(); // Track cache hits
        return cached;
      }

      console.log(`⚠️ Cache miss for embedding: ${key}`);
      await this.incrementCacheMiss(); // Track cache misses
      return null;
    } catch (error) {
      console.error('❌ Error getting cached embedding:', error);
      return null;
    }
  }

  /**
   * Cache document metadata
   */
  async cacheDocumentMetadata(documentId: string, metadata: any): Promise<void> {
    try {
      const key = `${CACHE_PREFIX}doc:${documentId}`;
      await kv.set(key, metadata, { ex: EMBEDDING_CACHE_TTL });
      console.log(`✅ Cached document metadata: ${key}`);
    } catch (error) {
      console.error('❌ Error caching document metadata:', error);
    }
  }

  /**
   * Get cached document metadata
   */
  async getCachedDocumentMetadata(documentId: string): Promise<any | null> {
    try {
      const key = `${CACHE_PREFIX}doc:${documentId}`;
      const cached = await kv.get(key);

      if (cached) {
        console.log(`✅ Cache hit for document: ${key}`);
        return cached;
      }

      return null;
    } catch (error) {
      console.error('❌ Error getting cached document metadata:', error);
      return null;
    }
  }

  /**
   * Invalidate cache by pattern
   */
  async invalidateCache(pattern: string): Promise<void> {
    try {
      // Note: KV doesn't support pattern-based deletion natively
      // This is a placeholder for future implementation
      console.log(`⚠️ Cache invalidation not fully supported. Pattern: ${pattern}`);
    } catch (error) {
      console.error('❌ Error invalidating cache:', error);
    }
  }

  /**
   * Clear all cached queries (use sparingly)
   */
  async clearQueryCache(): Promise<void> {
    try {
      // Note: This would require scanning all keys, which is expensive
      console.log('⚠️ Full cache clear not implemented. Use invalidateCache for specific patterns.');
    } catch (error) {
      console.error('❌ Error clearing query cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<{ hits: number; misses: number } | null> {
    try {
      const statsKey = `${CACHE_PREFIX}stats`;
      const stats = await kv.get<{ hits: number; misses: number }>(statsKey);
      return stats || { hits: 0, misses: 0 };
    } catch (error) {
      console.error('❌ Error getting cache stats:', error);
      return null;
    }
  }

  /**
   * Increment cache hit counter
   */
  private async incrementCacheHit(): Promise<void> {
    try {
      const statsKey = `${CACHE_PREFIX}stats`;
      const stats = await this.getCacheStats() || { hits: 0, misses: 0 };
      stats.hits++;
      await kv.set(statsKey, stats, { ex: 86400 }); // 24 hours
    } catch (error) {
      console.error('❌ Error incrementing cache hit:', error);
    }
  }

  /**
   * Increment cache miss counter
   */
  private async incrementCacheMiss(): Promise<void> {
    try {
      const statsKey = `${CACHE_PREFIX}stats`;
      const stats = await this.getCacheStats() || { hits: 0, misses: 0 };
      stats.misses++;
      await kv.set(statsKey, stats, { ex: 86400 }); // 24 hours
    } catch (error) {
      console.error('❌ Error incrementing cache miss:', error);
    }
  }
}

// Export singleton instance
export const cacheService = new CacheService();
