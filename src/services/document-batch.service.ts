import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import { supabaseService } from './supabase.service';
import { cacheService } from './cache.service';
import config from '../config';

/**
 * Document Batch Processing Service
 * Handles batch uploads, processing, and embedding generation for multiple documents
 */

interface DocumentProcessingResult {
  filename: string;
  success: boolean;
  documentId?: string;
  chunkCount?: number;
  error?: string;
}

interface BatchProcessingReport {
  total: number;
  successful: number;
  failed: number;
  results: DocumentProcessingResult[];
  duration: number;
}

export class DocumentBatchService {
  private openai: OpenAI;
  private pinecone: Pinecone;

  constructor() {
    this.openai = new OpenAI({ apiKey: config.openai.apiKey });
    this.pinecone = new Pinecone({ apiKey: config.pinecone.apiKey });
  }

  /**
   * Process multiple documents in batch
   */
  async processBatch(
    files: Array<{ filename: string; content: Buffer; contentType: string }>
  ): Promise<BatchProcessingReport> {
    const startTime = Date.now();
    const results: DocumentProcessingResult[] = [];

    console.log(`📦 Starting batch processing for ${files.length} documents`);

    for (const file of files) {
      try {
        const result = await this.processDocument(file);
        results.push(result);

        if (result.success) {
          console.log(`✅ Processed: ${file.filename} (${result.chunkCount} chunks)`);
        } else {
          console.error(`❌ Failed: ${file.filename} - ${result.error}`);
        }
      } catch (error) {
        console.error(`❌ Error processing ${file.filename}:`, error);
        results.push({
          filename: file.filename,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    const duration = Date.now() - startTime;
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    const report: BatchProcessingReport = {
      total: files.length,
      successful,
      failed,
      results,
      duration,
    };

    console.log(`📊 Batch processing complete: ${successful}/${files.length} successful in ${duration}ms`);

    return report;
  }

  /**
   * Process a single document
   */
  private async processDocument(file: {
    filename: string;
    content: Buffer;
    contentType: string;
  }): Promise<DocumentProcessingResult> {
    try {
      // 1. Upload to Supabase Storage
      const uploadResult = await supabaseService.uploadFile(
        file.content,
        file.filename,
        file.filename,
        file.contentType
      );

      if (!uploadResult.publicUrl) {
        return {
          filename: file.filename,
          success: false,
          error: 'Failed to upload file to storage',
        };
      }

      // 2. Extract text content
      const textContent = await this.extractText(file.content, file.contentType);

      if (!textContent) {
        return {
          filename: file.filename,
          success: false,
          error: 'Failed to extract text from file',
        };
      }

      // 3. Split into chunks
      const chunks = this.splitIntoChunks(textContent);

      // 4. Generate embeddings for each chunk
      const embeddings = await this.generateEmbeddings(chunks);

      // 5. Store in Pinecone
      const index = this.pinecone.Index(config.pinecone.indexName);
      const vectors = embeddings.map((embedding, i) => ({
        id: `${file.filename}-chunk-${i}`,
        values: embedding,
        metadata: {
          filename: file.filename,
          chunkIndex: i,
          text: chunks[i],
          url: uploadResult.publicUrl,
          uploadedAt: new Date().toISOString(),
        },
      }));

      await index.upsert(vectors);

      // 6. Cache document metadata
      await cacheService.cacheDocumentMetadata(file.filename, {
        filename: file.filename,
        chunkCount: chunks.length,
        url: uploadResult.publicUrl,
        processedAt: new Date().toISOString(),
      });

      return {
        filename: file.filename,
        success: true,
        documentId: file.filename,
        chunkCount: chunks.length,
      };
    } catch (error) {
      console.error(`Error processing document ${file.filename}:`, error);
      return {
        filename: file.filename,
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Extract text from document based on content type
   */
  private async extractText(content: Buffer, contentType: string): Promise<string | null> {
    try {
      // For plain text files
      if (contentType.includes('text/plain')) {
        return content.toString('utf-8');
      }

      // For JSON files
      if (contentType.includes('application/json')) {
        const json = JSON.parse(content.toString('utf-8'));
        return JSON.stringify(json, null, 2);
      }

      // For markdown files
      if (contentType.includes('text/markdown')) {
        return content.toString('utf-8');
      }

      // For other types, try UTF-8 conversion
      return content.toString('utf-8');
    } catch (error) {
      console.error('Error extracting text:', error);
      return null;
    }
  }

  /**
   * Split text into chunks for embedding
   */
  private splitIntoChunks(text: string, chunkSize: number = 1000, overlap: number = 200): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      const chunk = text.slice(start, end);
      chunks.push(chunk);

      // Move start forward, accounting for overlap
      start = end - overlap;

      // Prevent infinite loop
      if (start <= 0) start = end;
    }

    return chunks;
  }

  /**
   * Generate embeddings for multiple text chunks
   */
  private async generateEmbeddings(texts: string[]): Promise<number[][]> {
    const embeddings: number[][] = [];

    // Process in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < texts.length; i += batchSize) {
      const batch = texts.slice(i, i + batchSize);

      // Check cache first
      const cachedEmbeddings = await Promise.all(
        batch.map(text => cacheService.getCachedEmbedding(text))
      );

      // Identify texts that need embedding
      const textsToEmbed: string[] = [];
      const embedIndices: number[] = [];

      batch.forEach((text, idx) => {
        if (cachedEmbeddings[idx]) {
          embeddings.push(cachedEmbeddings[idx]!);
        } else {
          textsToEmbed.push(text);
          embedIndices.push(embeddings.length);
          embeddings.push([]); // Placeholder
        }
      });

      // Generate embeddings for uncached texts
      if (textsToEmbed.length > 0) {
        const response = await this.openai.embeddings.create({
          model: config.openai.embeddingModel,
          input: textsToEmbed,
          dimensions: config.openai.embeddingDimensions,
        });

        // Fill in the embeddings and cache them
        response.data.forEach((item, idx) => {
          const embedding = item.embedding;
          embeddings[embedIndices[idx]] = embedding;

          // Cache for future use
          cacheService.cacheEmbedding(textsToEmbed[idx], embedding);
        });
      }
    }

    return embeddings;
  }

  /**
   * Check for duplicate documents
   */
  async checkDuplicates(filename: string): Promise<boolean> {
    try {
      const cached = await cacheService.getCachedDocumentMetadata(filename);
      return cached !== null;
    } catch (error) {
      console.error('Error checking duplicates:', error);
      return false;
    }
  }

  /**
   * Delete document and its embeddings
   */
  async deleteDocument(filename: string): Promise<boolean> {
    try {
      // 1. Delete from Pinecone (all chunks)
      const index = this.pinecone.Index(config.pinecone.indexName);

      // Get document metadata to find chunk count
      const metadata = await cacheService.getCachedDocumentMetadata(filename);
      const chunkCount = metadata?.chunkCount || 0;

      // Delete all chunks
      const ids = Array.from({ length: chunkCount }, (_, i) => `${filename}-chunk-${i}`);
      await index.deleteMany(ids);

      // 2. Delete from Supabase Storage
      await supabaseService.deleteFile(filename);

      // 3. Clear cache
      await cacheService.invalidateCache(`doc:${filename}`);

      console.log(`✅ Deleted document: ${filename}`);
      return true;
    } catch (error) {
      console.error(`❌ Error deleting document ${filename}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const documentBatchService = new DocumentBatchService();
