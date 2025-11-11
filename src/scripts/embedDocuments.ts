import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { doclingService } from '../services/docling.service';
import { pineconeService } from '../services/pinecone.service';
import { openaiService } from '../services/openai.service';

/**
 * Embed documents from a directory using Docling for intelligent chunking
 * 
 * Usage:
 * 1. Place your documents (PDF, TXT, MD) in the 'documents' folder
 * 2. Run: npm run embed:docs
 * 3. Documents will be processed, chunked, and embedded to Pinecone
 */

const DOCUMENTS_DIR = path.join(process.cwd(), 'documents');

// Chunking configuration
const CHUNKING_OPTIONS = {
  chunkSize: 1000,           // ~1000 characters per chunk
  chunkOverlap: 200,         // 200 character overlap between chunks
  preserveParagraphs: true,  // Keep paragraphs intact when possible
};

async function embedDocuments() {
  console.log('🚀 Starting Document Embedding Process\n');
  console.log(`📁 Documents directory: ${DOCUMENTS_DIR}`);
  console.log(`⚙️  Chunking options:`, CHUNKING_OPTIONS);
  console.log('─'.repeat(60));

  try {
    // Step 1: Process all documents and create chunks
    console.log('\n📄 Step 1: Processing documents with Docling...\n');
    const chunks = await doclingService.processDirectory(
      DOCUMENTS_DIR,
      CHUNKING_OPTIONS
    );

    if (chunks.length === 0) {
      console.log('\n⚠️  No documents found or processed.');
      console.log('Place PDF, TXT, or MD files in the "documents" folder.');
      return;
    }

    // Show statistics
    const stats = doclingService.getChunkStats(chunks);
    console.log('\n📊 Chunking Statistics:');
    console.log(`   Total chunks: ${stats.totalChunks}`);
    console.log(`   Average chunk size: ${stats.avgChunkSize} characters`);
    console.log(`   Min chunk size: ${stats.minChunkSize} characters`);
    console.log(`   Max chunk size: ${stats.maxChunkSize} characters`);
    console.log(`   Total characters: ${stats.totalCharacters}`);

    // Step 2: Create embeddings for each chunk
    console.log('\n🧮 Step 2: Creating embeddings with OpenRouter...\n');
    const vectors = [];
    let successCount = 0;
    let errorCount = 0;

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      process.stdout.write(
        `   Processing chunk ${i + 1}/${chunks.length} (${chunk.metadata.filename})... `
      );

      try {
        // Create embedding
        const embedding = await openaiService.createEmbedding(chunk.text);

        vectors.push({
          id: uuidv4(),
          values: embedding,
          metadata: {
            text: chunk.text,
            source: chunk.metadata.filename,
            chunkIndex: chunk.metadata.chunkIndex,
            totalChunks: chunk.metadata.totalChunks,
            pageNumber: chunk.metadata.pageNumber,
            documentType: chunk.metadata.documentType,
            chunkSize: chunk.text.length,
          },
        });

        console.log('✓');
        successCount++;

        // Rate limiting: small delay between API calls
        if ((i + 1) % 5 === 0) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        } else {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      } catch (error) {
        console.log('✗');
        console.error(`   Error: ${error}`);
        errorCount++;
      }
    }

    console.log(`\n   ✓ Successfully created ${successCount} embeddings`);
    if (errorCount > 0) {
      console.log(`   ✗ Failed to create ${errorCount} embeddings`);
    }

    // Step 3: Upload to Pinecone
    console.log('\n📤 Step 3: Uploading vectors to Pinecone...\n');
    
    if (vectors.length === 0) {
      console.log('   ⚠️  No vectors to upload');
      return;
    }

    // Upload in batches of 100 (Pinecone limit)
    const BATCH_SIZE = 100;
    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
      const batch = vectors.slice(i, Math.min(i + BATCH_SIZE, vectors.length));
      process.stdout.write(
        `   Uploading batch ${Math.floor(i / BATCH_SIZE) + 1}/${Math.ceil(vectors.length / BATCH_SIZE)} (${batch.length} vectors)... `
      );

      try {
        await pineconeService.upsertEmbeddings(batch);
        console.log('✓');
      } catch (error) {
        console.log('✗');
        console.error(`   Error: ${error}`);
      }

      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log('\n✅ Document Embedding Complete!\n');
    console.log('Summary:');
    console.log(`   📄 Documents processed: ${new Set(chunks.map(c => c.metadata.filename)).size}`);
    console.log(`   📦 Total chunks created: ${chunks.length}`);
    console.log(`   🧮 Vectors uploaded: ${vectors.length}`);
    console.log(`   💾 Average chunk size: ${stats.avgChunkSize} characters`);
    console.log('\n🤖 Your RAG chatbot is now ready with document knowledge!\n');

  } catch (error) {
    console.error('\n❌ Error during document embedding:', error);
    process.exit(1);
  }
}

// Handle command line arguments
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
Document Embedding Tool - Powered by Docling

Usage:
  npm run embed:docs              Process all documents in /documents folder
  npm run embed:docs -- --help    Show this help message

Features:
  ✓ Intelligent document chunking with Docling
  ✓ Supports PDF, TXT, and MD files
  ✓ Preserves paragraph structure
  ✓ Chunk overlap for better context
  ✓ Page number tracking for PDFs
  ✓ Automatic embedding generation
  ✓ Batch upload to Pinecone

Setup:
  1. Create a 'documents' folder in project root
  2. Add your PDF, TXT, or MD files
  3. Run this script
  4. Use the chatbot with your document knowledge!

Configuration:
  Edit CHUNKING_OPTIONS in this file to customize:
  - chunkSize: Characters per chunk (default: 1000)
  - chunkOverlap: Overlap between chunks (default: 200)
  - preserveParagraphs: Keep paragraphs intact (default: true)
  `);
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  embedDocuments()
    .then(() => process.exit(0))
    .catch(error => {
      console.error(error);
      process.exit(1);
    });
}

export { embedDocuments };
