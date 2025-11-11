/**
 * Knowledge Base Upload Script
 *
 * Processes documents from knowledge-base/ directory with intelligent chunking,
 * generates embeddings, and uploads to Pinecone for RAG retrieval.
 *
 * Usage: npm run upload:knowledge
 */

import fs from 'fs/promises';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import pdf from 'pdf-parse';
import { openrouterService } from '../services/openrouter.service';
import { pineconeService } from '../services/pinecone.service';

// Configuration
const KNOWLEDGE_BASE_DIR = path.join(process.cwd(), 'knowledge-base');
const CHUNK_SIZE = 1000; // characters
const CHUNK_OVERLAP = 200; // characters
const BATCH_SIZE = 100; // vectors per batch
const RATE_LIMIT_MS = 200; // delay between embedding requests
const MAX_RETRIES = 3;

interface DocumentChunk {
  text: string;
  metadata: {
    source: string;
    practice: string;
    documentType: string;
    chunkIndex: number;
    totalChunks: number;
    category?: string;
  };
}

interface ProcessingStats {
  filesProcessed: number;
  filesSkipped: number;
  totalChunks: number;
  totalVectors: number;
  errors: string[];
}

/**
 * Extract text from PDF file
 */
async function extractPdfText(filePath: string): Promise<string> {
  try {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdf(dataBuffer);
    return data.text;
  } catch (error) {
    throw new Error(`Failed to extract PDF text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from TXT or MD file
 */
async function extractTextFile(filePath: string): Promise<string> {
  try {
    return await fs.readFile(filePath, 'utf-8');
  } catch (error) {
    throw new Error(`Failed to read text file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text based on file type
 */
async function extractText(filePath: string, fileType: string): Promise<string> {
  switch (fileType.toLowerCase()) {
    case 'pdf':
      return extractPdfText(filePath);
    case 'txt':
    case 'md':
      return extractTextFile(filePath);
    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }
}

/**
 * Intelligent text chunking with paragraph awareness and overlap
 */
function createChunks(text: string, fileName: string): string[] {
  // Clean and normalize text
  const normalizedText = text
    .replace(/\r\n/g, '\n')
    .replace(/\t/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Split into paragraphs
  const paragraphs = normalizedText.split(/\n\n+/);

  const chunks: string[] = [];
  let currentChunk = '';

  for (const paragraph of paragraphs) {
    const trimmedParagraph = paragraph.trim();

    if (!trimmedParagraph) continue;

    // If adding this paragraph would exceed chunk size
    if (currentChunk.length + trimmedParagraph.length > CHUNK_SIZE) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());

        // Create overlap from the end of the current chunk
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5)); // ~5 chars per word
        currentChunk = overlapWords.join(' ') + ' ';
      }

      // If single paragraph is larger than chunk size, split it
      if (trimmedParagraph.length > CHUNK_SIZE) {
        const sentences = trimmedParagraph.match(/[^.!?]+[.!?]+/g) || [trimmedParagraph];

        for (const sentence of sentences) {
          if (currentChunk.length + sentence.length > CHUNK_SIZE) {
            if (currentChunk) {
              chunks.push(currentChunk.trim());

              // Create overlap
              const words = currentChunk.split(' ');
              const overlapWords = words.slice(-Math.floor(CHUNK_OVERLAP / 5));
              currentChunk = overlapWords.join(' ') + ' ';
            }
          }
          currentChunk += sentence + ' ';
        }
      } else {
        currentChunk += trimmedParagraph + '\n\n';
      }
    } else {
      currentChunk += trimmedParagraph + '\n\n';
    }
  }

  // Add remaining chunk
  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  // Filter out very small chunks (< 100 chars)
  return chunks.filter(chunk => chunk.length >= 100);
}

/**
 * Infer category from content
 */
function inferCategory(text: string): string {
  const lowerText = text.toLowerCase();

  if (lowerText.includes('price') || lowerText.includes('cost') || lowerText.includes('$')) {
    return 'pricing';
  }
  if (lowerText.includes('hour') || lowerText.includes('open') || lowerText.includes('closed')) {
    return 'hours';
  }
  if (lowerText.includes('service') || lowerText.includes('treatment') || lowerText.includes('procedure')) {
    return 'services';
  }
  if (lowerText.includes('insurance') || lowerText.includes('payment') || lowerText.includes('financing')) {
    return 'financial';
  }
  if (lowerText.includes('emergency') || lowerText.includes('urgent')) {
    return 'emergency';
  }
  if (lowerText.includes('dr.') || lowerText.includes('doctor') || lowerText.includes('dentist')) {
    return 'team';
  }

  return 'general';
}

/**
 * Process a single document
 */
async function processDocument(filePath: string, stats: ProcessingStats): Promise<DocumentChunk[]> {
  const fileName = path.basename(filePath);
  const fileExt = path.extname(fileName).slice(1);

  console.log(`\n📄 Processing: ${fileName}`);

  try {
    // Extract text
    const text = await extractText(filePath, fileExt);
    console.log(`   ✓ Extracted ${text.length} characters`);

    // Create chunks
    const textChunks = createChunks(text, fileName);
    console.log(`   ✓ Created ${textChunks.length} chunks`);

    // Create document chunks with metadata
    const documentChunks: DocumentChunk[] = textChunks.map((chunk, index) => ({
      text: chunk,
      metadata: {
        source: fileName,
        practice: 'Shoreline Dental Chicago',
        documentType: fileExt,
        chunkIndex: index,
        totalChunks: textChunks.length,
        category: inferCategory(chunk),
      },
    }));

    stats.totalChunks += textChunks.length;
    return documentChunks;
  } catch (error) {
    const errorMsg = `Error processing ${fileName}: ${error instanceof Error ? error.message : 'Unknown error'}`;
    console.error(`   ✗ ${errorMsg}`);
    stats.errors.push(errorMsg);
    stats.filesSkipped++;
    return [];
  }
}

/**
 * Generate embedding with retry logic
 */
async function generateEmbeddingWithRetry(text: string, retries = MAX_RETRIES): Promise<number[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await openrouterService.createEmbedding(text);
    } catch (error) {
      if (attempt === retries) {
        throw error;
      }
      const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
      console.log(`   ⚠ Retry ${attempt}/${retries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Failed to generate embedding after retries');
}

/**
 * Create embeddings and upload to Pinecone
 */
async function uploadToPinecone(chunks: DocumentChunk[], stats: ProcessingStats): Promise<void> {
  console.log(`\n🔄 Generating embeddings for ${chunks.length} chunks...`);

  const vectors = [];

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];

    try {
      // Generate embedding
      const embedding = await generateEmbeddingWithRetry(chunk.text);

      vectors.push({
        id: uuidv4(),
        values: embedding,
        metadata: {
          ...chunk.metadata,
          text: chunk.text,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Rate limiting
      if (i < chunks.length - 1) {
        await new Promise(resolve => setTimeout(resolve, RATE_LIMIT_MS));
      }

      // Progress indicator
      if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
        console.log(`   ⏳ Progress: ${i + 1}/${chunks.length} embeddings generated`);
      }
    } catch (error) {
      const errorMsg = `Failed to generate embedding for chunk ${i}: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`   ✗ ${errorMsg}`);
      stats.errors.push(errorMsg);
    }
  }

  // Upload to Pinecone in batches
  console.log(`\n📤 Uploading ${vectors.length} vectors to Pinecone...`);

  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    const batch = vectors.slice(i, Math.min(i + BATCH_SIZE, vectors.length));

    try {
      await pineconeService.upsertEmbeddings(batch);
      stats.totalVectors += batch.length;
      console.log(`   ✓ Uploaded batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectors.length / BATCH_SIZE)}`);
    } catch (error) {
      const errorMsg = `Failed to upload batch: ${error instanceof Error ? error.message : 'Unknown error'}`;
      console.error(`   ✗ ${errorMsg}`);
      stats.errors.push(errorMsg);
    }
  }
}

/**
 * Main execution
 */
async function main() {
  console.log('🚀 Starting Knowledge Base Upload Process\n');
  console.log(`📁 Source: ${KNOWLEDGE_BASE_DIR}`);
  console.log(`⚙️  Config: ${CHUNK_SIZE} chars per chunk, ${CHUNK_OVERLAP} overlap\n`);

  const stats: ProcessingStats = {
    filesProcessed: 0,
    filesSkipped: 0,
    totalChunks: 0,
    totalVectors: 0,
    errors: [],
  };

  try {
    // Check if knowledge base directory exists
    try {
      await fs.access(KNOWLEDGE_BASE_DIR);
    } catch {
      console.error(`❌ Directory not found: ${KNOWLEDGE_BASE_DIR}`);
      console.log('\n💡 Create the directory and add your documents:');
      console.log(`   mkdir -p ${KNOWLEDGE_BASE_DIR}`);
      console.log(`   # Add your PDF, TXT, or MD files to this directory`);
      process.exit(1);
    }

    // Read all files from knowledge base directory
    const files = await fs.readdir(KNOWLEDGE_BASE_DIR);
    const supportedFiles = files.filter(file => {
      const ext = path.extname(file).toLowerCase();
      return ['.pdf', '.txt', '.md'].includes(ext);
    });

    if (supportedFiles.length === 0) {
      console.error('❌ No supported documents found in knowledge-base/');
      console.log('\n💡 Supported formats: PDF, TXT, MD');
      process.exit(1);
    }

    console.log(`📚 Found ${supportedFiles.length} documents to process\n`);
    console.log('─'.repeat(60));

    // Process all documents
    const allChunks: DocumentChunk[] = [];

    for (const file of supportedFiles) {
      const filePath = path.join(KNOWLEDGE_BASE_DIR, file);
      const chunks = await processDocument(filePath, stats);
      allChunks.push(...chunks);
      stats.filesProcessed++;
    }

    console.log('\n' + '─'.repeat(60));

    if (allChunks.length === 0) {
      console.error('❌ No chunks generated from documents');
      process.exit(1);
    }

    // Upload all chunks to Pinecone
    await uploadToPinecone(allChunks, stats);

    // Print summary
    console.log('\n' + '═'.repeat(60));
    console.log('📊 PROCESSING SUMMARY');
    console.log('═'.repeat(60));
    console.log(`✓ Files processed:  ${stats.filesProcessed}`);
    console.log(`✗ Files skipped:    ${stats.filesSkipped}`);
    console.log(`📝 Total chunks:     ${stats.totalChunks}`);
    console.log(`🎯 Vectors uploaded: ${stats.totalVectors}`);

    if (stats.errors.length > 0) {
      console.log(`\n⚠️  Errors encountered: ${stats.errors.length}`);
      stats.errors.forEach((error, i) => {
        console.log(`   ${i + 1}. ${error}`);
      });
    } else {
      console.log('\n✨ All documents processed successfully!');
    }

    console.log('═'.repeat(60));
    console.log('\n🎉 Upload complete! Your knowledge base is ready.\n');

  } catch (error) {
    console.error('\n❌ Fatal error:', error instanceof Error ? error.message : 'Unknown error');
    process.exit(1);
  }
}

// Run the script
main().catch(error => {
  console.error('Unhandled error:', error);
  process.exit(1);
});
