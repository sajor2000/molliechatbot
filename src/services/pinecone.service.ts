import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config';
import { PineconeMatch, PineconeMetadata } from '../types/api.types';

export class PineconeService {
  private client: Pinecone;
  private indexName: string;
  private namespace: string;

  constructor() {
    this.client = new Pinecone({
      apiKey: config.pinecone.apiKey,
    });
    this.indexName = config.pinecone.indexName;
    this.namespace = config.pinecone.namespace || '';
  }

  /**
   * Get Pinecone index scoped to configured namespace (if provided)
   */
  private getIndex() {
    const index = this.client.index(this.indexName);
    return this.namespace ? index.namespace(this.namespace) : index;
  }

  private mapMatch(match: any): PineconeMatch {
    return {
      id: match.id,
      score: match.score ?? 0,
      values: match.values,
      metadata: match.metadata as PineconeMetadata | undefined,
    };
  }

  /**
   * Flatten metadata to only include Pinecone-compatible types
   * Pinecone only accepts: string, number, boolean, or string[]
   */
  private flattenMetadata(metadata: Record<string, any>): Record<string, string | number | boolean | string[]> {
    const flatMetadata: Record<string, string | number | boolean | string[]> = {};

    Object.entries(metadata).forEach(([key, value]) => {
      // Skip complex objects, only include primitives and string arrays
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        flatMetadata[key] = value;
      } else if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
        flatMetadata[key] = value;
      } else if (typeof value === 'object' && value !== null) {
        flatMetadata[key] = JSON.stringify(value);
      }
    });

    return flatMetadata;
  }

  async upsertEmbeddings(vectors: Array<{
    id: string;
    values: number[];
    metadata?: Record<string, any>;
  }>) {
    try {
      // Validate vector dimensions
      if (vectors.length > 0 && vectors[0].values) {
        const dimension = vectors[0].values.length;
        console.log(`📤 Upserting ${vectors.length} vectors with ${dimension} dimensions`);
      }

      // Flatten metadata for all vectors to ensure Pinecone compatibility
      const sanitizedVectors = vectors.map(vector => ({
        ...vector,
        metadata: vector.metadata ? this.flattenMetadata(vector.metadata) : undefined
      }));

      if (sanitizedVectors.length === 0) {
        console.warn('⚠️ No vectors to upsert after sanitization');
        return;
      }

      const index = this.getIndex();
      const batchSize = 100;

      for (let i = 0; i < sanitizedVectors.length; i += batchSize) {
        const batch = sanitizedVectors.slice(i, i + batchSize);
        await index.upsert(batch);
        console.log(`📦 Upserted batch ${i / batchSize + 1} (${batch.length} vectors) into namespace "${this.namespace || 'default'}"`);
      }
    } catch (error) {
      console.error('❌ Error upserting to Pinecone:', error);

      if (error instanceof Error && error.message.includes('dimension')) {
        throw new Error('Vector dimension mismatch. Please check your embedding configuration.');
      }

      if (error instanceof Error && error.message.includes('Metadata')) {
        throw new Error('Metadata validation failed. Please check that all metadata values are primitives.');
      }

      throw new Error('Failed to upload vectors to Pinecone. Please try again.');
    }
  }

  async queryEmbeddings(queryVector: number[], topK: number = 5): Promise<PineconeMatch[]> {
    try {
      const index = this.getIndex();
      const queryResponse = await index.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
      });
      return (queryResponse.matches || []).map(match => this.mapMatch(match));
    } catch (error) {
      console.error('❌ Error querying Pinecone:', error);

      if (error instanceof Error && error.message.includes('dimension')) {
        throw new Error('Query vector dimension mismatch. Please check your embedding configuration.');
      }

      // Return empty array for graceful degradation (RAG will work without context)
      console.warn('⚠️  Returning empty results due to Pinecone error');
      return [];
    }
  }

  async deleteAll() {
    const index = this.getIndex();
    await index.deleteAll();
  }

  /**
   * Delete vectors by metadata filter
   * Useful for cleaning up when documents are deleted
   */
  async deleteVectorsByMetadata(filter: Record<string, any>) {
    try {
      const index = this.getIndex();
      await index.deleteMany({ filter });
      console.log(`✅ Deleted vectors matching filter:`, filter);
    } catch (error) {
      console.error('❌ Error deleting vectors by metadata:', error);
      throw new Error('Failed to delete vectors from Pinecone');
    }
  }

  /**
   * Get index statistics (vector count, dimension, etc.)
   */
  async getIndexStats() {
    try {
      const index = this.client.index(this.indexName);
      const stats = await index.describeIndexStats();
      return stats;
    } catch (error) {
      console.error('❌ Error getting index stats:', error);
      throw new Error('Failed to retrieve Pinecone index statistics');
    }
  }
}

export const pineconeService = new PineconeService();
