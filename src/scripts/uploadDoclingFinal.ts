import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { Pinecone } from '@pinecone-database/pinecone';
import { v4 as uuidv4 } from 'uuid';

/**
 * Final Upload Script with Timer Tracking and Progress Tracing
 * Fixes all API key loading issues and provides detailed progress feedback
 */

// ============================================================================
// CONFIGURATION & ENV LOADING
// ============================================================================

// Load .env file manually (fixes dotenv loading issues)
const envPath = path.join(process.cwd(), '.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars: Record<string, string> = {};

envContent.split('\n').forEach(line => {
  const trimmedLine = line.trim();
  // Skip empty lines and comments
  if (!trimmedLine || trimmedLine.startsWith('#')) return;

  const match = trimmedLine.match(/^([A-Z_]+)=(.*)$/);
  if (match) {
    envVars[match[1]] = match[2].trim();
  }
});

const OPENAI_API_KEY = envVars.OPENAI_API_KEY;
const PINECONE_API_KEY = envVars.PINECONE_API_KEY;
const PINECONE_INDEX_NAME = envVars.PINECONE_INDEX_NAME || 'chatbot';

// Validate required env vars
if (!OPENAI_API_KEY) {
  console.error('❌ Error: OPENAI_API_KEY not found in .env file');
  process.exit(1);
}
if (!PINECONE_API_KEY) {
  console.error('❌ Error: PINECONE_API_KEY not found in .env file');
  process.exit(1);
}

// ============================================================================
// TYPES
// ============================================================================

interface DoclingChunk {
  text: string;
  metadata: Record<string, any>;
}

interface ProgressTracker {
  startTime: number;
  currentStep: string;
  stepsCompleted: number;
  totalSteps: number;
  successCount: number;
  errorCount: number;
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Format elapsed time in human-readable format
 */
function formatTime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
}

/**
 * Create OpenAI embedding with retry logic
 */
async function createEmbedding(text: string, retries = 3): Promise<number[]> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await axios.post(
        'https://api.openai.com/v1/embeddings',
        {
          model: 'text-embedding-3-large',
          input: text,
          dimensions: 1024
        },
        {
          headers: {
            'Authorization': `Bearer ${OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 30000 // 30 second timeout
        }
      );
      return response.data.data[0].embedding;
    } catch (error: any) {
      if (attempt === retries) {
        throw error;
      }

      // Rate limit or server error - wait and retry
      const waitTime = attempt * 1000; // Exponential backoff
      console.log(`   ⚠️  Retry ${attempt}/${retries} after ${waitTime}ms...`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
    }
  }

  throw new Error('Failed after all retries');
}

/**
 * Display progress bar
 */
function displayProgress(current: number, total: number, prefix: string = ''): string {
  const percentage = Math.floor((current / total) * 100);
  const barLength = 40;
  const filledLength = Math.floor((barLength * current) / total);
  const bar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
  return `${prefix}[${bar}] ${percentage}% (${current}/${total})`;
}

/**
 * Update progress tracker and display status
 */
function updateProgress(tracker: ProgressTracker, message?: string): void {
  const elapsed = Date.now() - tracker.startTime;
  const elapsedStr = formatTime(elapsed);

  if (message) {
    console.log(`   ⏱️  [${elapsedStr}] ${message}`);
  }
}

// ============================================================================
// MAIN UPLOAD FUNCTION
// ============================================================================

async function uploadToDocling() {
  const startTime = Date.now();

  console.log('═'.repeat(70));
  console.log('  📤 Upload Docling-Processed Chunks to Pinecone');
  console.log('  🔧 With Timer Tracking & Progress Tracing');
  console.log('═'.repeat(70));
  console.log();

  const tracker: ProgressTracker = {
    startTime,
    currentStep: 'Initialization',
    stepsCompleted: 0,
    totalSteps: 4,
    successCount: 0,
    errorCount: 0
  };

  try {
    // ========================================================================
    // STEP 1: Load processed chunks
    // ========================================================================
    tracker.currentStep = 'Loading chunks';
    console.log('📦 Step 1/4: Loading processed chunks...');
    updateProgress(tracker, 'Reading processed-chunks.json');

    const chunksData = fs.readFileSync('processed-chunks.json', 'utf8');
    const chunks: DoclingChunk[] = JSON.parse(chunksData);

    updateProgress(tracker, `✓ Loaded ${chunks.length} chunks`);
    tracker.stepsCompleted++;
    console.log();

    // ========================================================================
    // STEP 2: Initialize Pinecone
    // ========================================================================
    tracker.currentStep = 'Initializing Pinecone';
    console.log('🔌 Step 2/4: Initializing Pinecone...');
    updateProgress(tracker, `Connecting to index: ${PINECONE_INDEX_NAME}`);

    const pinecone = new Pinecone({ apiKey: PINECONE_API_KEY });
    const index = pinecone.index(PINECONE_INDEX_NAME);

    updateProgress(tracker, '✓ Pinecone connected');
    tracker.stepsCompleted++;
    console.log();

    // ========================================================================
    // STEP 3: Generate embeddings
    // ========================================================================
    tracker.currentStep = 'Generating embeddings';
    console.log('🧮 Step 3/4: Generating embeddings...');
    console.log(`   Model: text-embedding-3-large (1024 dimensions)`);
    console.log(`   Rate limit: 200ms between requests`);
    console.log();

    const vectors = [];
    const embeddingStartTime = Date.now();

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const progress = displayProgress(i + 1, chunks.length, '   ');

      try {
        const embedding = await createEmbedding(chunk.text);

        // Flatten metadata to only include Pinecone-compatible types
        const flatMetadata: Record<string, string | number | boolean | string[]> = {
          text: chunk.text,
          textLength: chunk.text.length,
          chunkIndex: i,
        };

        // Copy simple metadata fields
        if (chunk.metadata) {
          Object.entries(chunk.metadata).forEach(([key, value]) => {
            // Skip complex objects, only include primitives and string arrays
            if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
              flatMetadata[key] = value;
            } else if (Array.isArray(value) && value.every(v => typeof v === 'string')) {
              flatMetadata[key] = value;
            } else if (typeof value === 'object' && value !== null) {
              // Stringify complex objects
              flatMetadata[key] = JSON.stringify(value);
            }
          });
        }

        vectors.push({
          id: uuidv4(),
          values: embedding,
          metadata: flatMetadata
        });

        tracker.successCount++;

        // Update progress every 10 chunks or at the end
        if ((i + 1) % 10 === 0 || i === chunks.length - 1) {
          const elapsed = Date.now() - embeddingStartTime;
          const avgTime = elapsed / (i + 1);
          const remaining = Math.floor((chunks.length - i - 1) * avgTime);

          console.log(`${progress} | Avg: ${Math.floor(avgTime)}ms/chunk | ETA: ${formatTime(remaining)}`);
        }

        // Rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error: any) {
        tracker.errorCount++;
        console.error(`   ✗ [${i + 1}/${chunks.length}] Error: ${error.message}`);
      }
    }

    const embeddingTime = Date.now() - embeddingStartTime;
    console.log();
    updateProgress(tracker, `✓ Generated ${tracker.successCount} embeddings in ${formatTime(embeddingTime)}`);
    if (tracker.errorCount > 0) {
      console.log(`   ⚠️  ${tracker.errorCount} chunks failed (skipped)`);
    }
    tracker.stepsCompleted++;
    console.log();

    // ========================================================================
    // STEP 4: Upload to Pinecone
    // ========================================================================
    tracker.currentStep = 'Uploading to Pinecone';
    console.log('📤 Step 4/4: Uploading vectors to Pinecone...');
    console.log(`   Batch size: 100 vectors per batch`);
    console.log();

    const BATCH_SIZE = 100;
    const batches = Math.ceil(vectors.length / BATCH_SIZE);
    let uploadedCount = 0;
    const uploadStartTime = Date.now();

    for (let i = 0; i < batches; i++) {
      const start = i * BATCH_SIZE;
      const end = Math.min(start + BATCH_SIZE, vectors.length);
      const batch = vectors.slice(start, end);
      const progress = displayProgress(i + 1, batches, '   ');

      try {
        await index.upsert(batch);
        uploadedCount += batch.length;

        const elapsed = Date.now() - uploadStartTime;
        const avgTime = elapsed / (i + 1);
        const remaining = Math.floor((batches - i - 1) * avgTime);

        console.log(`${progress} | ${uploadedCount} vectors | ETA: ${formatTime(remaining)}`);
      } catch (error: any) {
        console.error(`   ✗ Batch ${i + 1}/${batches} Error: ${error.message}`);
      }

      await new Promise(resolve => setTimeout(resolve, 500));
    }

    const uploadTime = Date.now() - uploadStartTime;
    updateProgress(tracker, `✓ Uploaded ${uploadedCount} vectors in ${formatTime(uploadTime)}`);
    tracker.stepsCompleted++;
    console.log();

    // ========================================================================
    // FINAL SUMMARY
    // ========================================================================
    const totalTime = Date.now() - startTime;

    console.log('═'.repeat(70));
    console.log('🎉 SUCCESS! Knowledge base uploaded to Pinecone');
    console.log('═'.repeat(70));
    console.log();
    console.log('📊 Statistics:');
    console.log(`   Total chunks:        ${chunks.length}`);
    console.log(`   Vectors uploaded:    ${uploadedCount}`);
    console.log(`   Success rate:        ${Math.floor((tracker.successCount / chunks.length) * 100)}%`);
    console.log(`   Avg chunk size:      ${Math.round(chunks.reduce((sum, c) => sum + c.text.length, 0) / chunks.length)} chars`);
    console.log();
    console.log('⏱️  Timing:');
    console.log(`   Embedding generation: ${formatTime(embeddingTime)}`);
    console.log(`   Pinecone upload:      ${formatTime(uploadTime)}`);
    console.log(`   Total time:           ${formatTime(totalTime)}`);
    console.log();
    console.log('✅ Your RAG chatbot is now ready with cleaned knowledge base!');
    console.log();

  } catch (error: any) {
    const elapsed = Date.now() - startTime;
    console.error();
    console.error('═'.repeat(70));
    console.error('❌ UPLOAD FAILED');
    console.error('═'.repeat(70));
    console.error(`Step: ${tracker.currentStep}`);
    console.error(`Time elapsed: ${formatTime(elapsed)}`);
    console.error(`Error: ${error.message}`);
    console.error();
    if (error.stack) {
      console.error('Stack trace:');
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// ============================================================================
// SCRIPT ENTRY POINT
// ============================================================================

uploadToDocling()
  .then(() => {
    console.log('✓ Script completed successfully');
    process.exit(0);
  })
  .catch(error => {
    console.error('✗ Fatal error:', error);
    process.exit(1);
  });
