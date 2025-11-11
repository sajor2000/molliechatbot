import axios from 'axios';
import { config } from '../config';

/**
 * Cohere Reranking Service
 *
 * Reranks retrieved documents using Cohere's rerank-english-v3.0 model
 * to improve RAG context relevance beyond simple vector similarity.
 *
 * Benefits:
 * - Better semantic understanding than cosine similarity alone
 * - Cross-encoder architecture for more accurate relevance scoring
 * - Significantly improves context quality for LLM responses
 */

export interface RerankDocument {
  text: string;
  metadata?: any;
}

export interface RerankResult {
  index: number;
  relevanceScore: number;
  document: RerankDocument;
}

export class CohereService {
  private apiKey: string;
  private baseURL = 'https://api.cohere.ai/v1';

  constructor() {
    this.apiKey = config.cohere.apiKey;
  }

  /**
   * Create fallback results when reranking is unavailable
   * Returns documents with decreasing dummy scores
   */
  private createFallbackResults(documents: RerankDocument[], topN: number): RerankResult[] {
    return documents.slice(0, topN).map((doc, index) => ({
      index,
      relevanceScore: 1.0 - (index * 0.1), // Decreasing scores: 1.0, 0.9, 0.8...
      document: doc,
    }));
  }

  /**
   * Rerank documents based on query relevance using Cohere's rerank model
   *
   * @param query - User's query text
   * @param documents - Array of documents to rerank
   * @param topN - Number of top results to return (default: 3)
   * @returns Reranked documents with relevance scores
   */
  async rerank(
    query: string,
    documents: RerankDocument[],
    topN: number = 3
  ): Promise<RerankResult[]> {
    try {
      if (!this.apiKey) {
        console.warn('⚠️  COHERE_API_KEY not configured, skipping reranking');
        return this.createFallbackResults(documents, topN);
      }

      console.log(`🔄 Reranking ${documents.length} documents with Cohere...`);

      const response = await axios.post(
        `${this.baseURL}/rerank`,
        {
          model: 'rerank-english-v3.0',
          query,
          documents: documents.map(doc => doc.text),
          top_n: topN,
          return_documents: false, // We already have the documents
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      // Map Cohere's results back to our documents with relevance scores
      const results: RerankResult[] = response.data.results.map((result: any) => ({
        index: result.index,
        relevanceScore: result.relevance_score,
        document: documents[result.index],
      }));

      console.log(`✅ Reranking complete. Top score: ${results[0]?.relevanceScore.toFixed(3)}`);

      return results;
    } catch (error) {
      console.error('❌ Error in Cohere reranking:', error);
      // Fallback to original order if reranking fails
      return this.createFallbackResults(documents, topN);
    }
  }
}

export const cohereService = new CohereService();
