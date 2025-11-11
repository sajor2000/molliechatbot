import { Pinecone } from '@pinecone-database/pinecone';
import { config } from '../config';

export class PineconeService {
  private client: Pinecone;
  private indexName: string;

  constructor() {
    this.client = new Pinecone({
      apiKey: config.pinecone.apiKey,
    });
    this.indexName = config.pinecone.indexName;
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
        // Stringify complex objects for Pinecone compatibility
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

      const index = this.client.index(this.indexName);
      await index.upsert(sanitizedVectors);
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

  async queryEmbeddings(queryVector: number[], topK: number = 5) {
    try {
      const index = this.client.index(this.indexName);
      const queryResponse = await index.query({
        vector: queryVector,
        topK,
        includeMetadata: true,
      });
      return queryResponse.matches || [];
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
    const index = this.client.index(this.indexName);
    await index.deleteAll();
  }
}

export const pineconeService = new PineconeService();
