import pdf from 'pdf-parse';
import { OpenAI } from 'openai';
import { Pinecone } from '@pinecone-database/pinecone';
import config from '../config';

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

const pinecone = new Pinecone({
  apiKey: config.pinecone.apiKey,
});

/**
 * Chunk text into smaller pieces for embedding
 * Uses simple sentence-based chunking with overlap
 */
export function chunkText(
  text: string,
  maxChunkSize: number = 1000,
  overlap: number = 200
): string[] {
  const chunks: string[] = [];

  // Split by paragraphs first
  const paragraphs = text.split(/\n\n+/).filter(p => p.trim().length > 0);

  let currentChunk = '';

  for (const paragraph of paragraphs) {
    // If adding this paragraph would exceed max size, save current chunk
    if (currentChunk.length + paragraph.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push(currentChunk.trim());

      // Start new chunk with overlap (last N characters of previous chunk)
      const overlapText = currentChunk.slice(-overlap);
      currentChunk = overlapText + '\n\n' + paragraph;
    } else {
      currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
    }
  }

  // Add remaining chunk
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * Extract text from PDF buffer
 */
export async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    const data = await pdf(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF extraction error:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

/**
 * Process markdown text (strip excessive formatting, normalize)
 */
export function processMarkdown(markdown: string): string {
  // Remove code blocks but keep the content
  let processed = markdown.replace(/```[\s\S]*?```/g, (match) => {
    return match.replace(/```\w*\n?/g, '').replace(/```$/g, '');
  });

  // Remove HTML tags
  processed = processed.replace(/<[^>]+>/g, '');

  // Normalize whitespace
  processed = processed.replace(/\n{3,}/g, '\n\n');

  // Remove excessive spaces
  processed = processed.replace(/ {2,}/g, ' ');

  return processed.trim();
}

/**
 * Generate embeddings using OpenAI
 */
export async function generateEmbeddings(
  texts: string[]
): Promise<number[][]> {
  try {
    const response = await openai.embeddings.create({
      model: config.openai.embeddingModel,
      input: texts,
      dimensions: config.openai.embeddingDimensions,
    });

    return response.data.map(item => item.embedding);
  } catch (error) {
    console.error('OpenAI embedding error:', error);
    throw new Error('Failed to generate embeddings');
  }
}

/**
 * Upload vectors to Pinecone
 */
export async function uploadToPinecone(
  chunks: string[],
  embeddings: number[][],
  metadata: { filename: string; uploadedAt: string; source?: string }
): Promise<{ success: boolean; count: number }> {
  try {
    const index = pinecone.index(config.pinecone.indexName);

    // Prepare vectors for upsert
    const vectors = chunks.map((chunk, i) => ({
      id: `${metadata.filename}-chunk-${i}-${Date.now()}`,
      values: embeddings[i],
      metadata: {
        text: chunk,
        filename: metadata.filename,
        uploadedAt: metadata.uploadedAt,
        chunkIndex: i,
        source: metadata.source || 'admin-upload',
      },
    }));

    // Upsert in batches of 100 (Pinecone limit)
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    return {
      success: true,
      count: vectors.length,
    };
  } catch (error) {
    console.error('Pinecone upload error:', error);
    throw new Error('Failed to upload vectors to Pinecone');
  }
}

/**
 * Main document processing pipeline
 */
export async function processDocument(
  buffer: Buffer,
  filename: string,
  fileType: 'pdf' | 'markdown' | 'text'
): Promise<{
  success: boolean;
  chunks: number;
  message: string;
}> {
  try {
    // Step 1: Extract text based on file type
    let text: string;

    if (fileType === 'pdf') {
      text = await extractPdfText(buffer);
    } else if (fileType === 'markdown') {
      text = processMarkdown(buffer.toString('utf-8'));
    } else {
      text = buffer.toString('utf-8');
    }

    if (!text || text.trim().length < 50) {
      throw new Error('Extracted text is too short or empty');
    }

    // Step 2: Chunk the text
    const chunks = chunkText(text, 1000, 200);

    if (chunks.length === 0) {
      throw new Error('No chunks created from document');
    }

    // Step 3: Generate embeddings (in batches to avoid rate limits)
    const batchSize = 50; // OpenAI allows ~100/min for embeddings
    const allEmbeddings: number[][] = [];

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      const embeddings = await generateEmbeddings(batch);
      allEmbeddings.push(...embeddings);

      // Small delay between batches to avoid rate limits
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    // Step 4: Upload to Pinecone
    const result = await uploadToPinecone(chunks, allEmbeddings, {
      filename,
      uploadedAt: new Date().toISOString(),
      source: 'serverless-upload',
    });

    return {
      success: true,
      chunks: result.count,
      message: `Successfully processed ${filename} - created ${result.count} vectors`,
    };
  } catch (error: any) {
    console.error('Document processing error:', error);
    throw new Error(error.message || 'Failed to process document');
  }
}
