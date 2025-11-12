import type { VercelResponse } from '@vercel/node';
import { requireAuth, type AuthRequest } from '../../../src/middleware/auth.middleware';
import formidable, { File } from 'formidable';
import { promises as fs } from 'fs';
import { openaiService } from '../../../src/services/openai.service';
import { Pinecone } from '@pinecone-database/pinecone';
import { config as appConfig } from '../../../src/config';
import { supabaseService } from '../../../src/services/supabase.service';
import { liteDocumentService } from '../../../src/services/document-lite.service';
import { createErrorHandler, addBreadcrumb } from '../../../src/services/sentry.service';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
  maxDuration: 60, // 60 seconds for document processing
};

async function handler(req: AuthRequest, res: VercelResponse): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  let uploadedFilePath: string | null = null;

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      allowEmptyFiles: false,
      filter: function ({ mimetype }) {
        // Allow PDF, Word, text, and markdown files
        return (
          mimetype === 'application/pdf' ||
          mimetype === 'text/plain' ||
          mimetype === 'text/markdown' ||
          mimetype === 'application/msword' ||
          mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          mimetype === 'application/octet-stream' // For .md files
        );
      },
    });

    const [fields, files] = await form.parse(req);

    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      res.status(400).json({
        error: 'Bad request',
        message: 'No file provided or invalid file type. Allowed types: PDF, DOC, DOCX, TXT, MD'
      });
      return;
    }

    const file = fileArray[0] as File;
    uploadedFilePath = file.filepath;

    console.log(`📄 Processing file: ${file.originalFilename} (${file.size} bytes)`);
    addBreadcrumb('Admin: Document upload started', {
      filename: file.originalFilename,
      size: file.size
    }, 'admin', 'info');

    const useDocling = appConfig.documentProcessing.mode === 'docling';
    console.log(`🔄 Chunking document with ${useDocling ? 'Docling' : 'Lite processor'}...`);
    const chunksPromise = useDocling
      ? (await import('../../../src/services/docling.service')).doclingService.processDocument(file.filepath)
      : liteDocumentService.processDocument(file.filepath);
    const resolvedChunks = await chunksPromise;

    if (resolvedChunks.length === 0) {
      res.status(400).json({
        error: 'Processing failed',
        message: 'No content could be extracted from the document'
      });
      return;
    }

    console.log(`✅ Created ${resolvedChunks.length} chunks`);
    addBreadcrumb('Document chunked successfully', { chunks: resolvedChunks.length, mode: useDocling ? 'docling' : 'lite' }, 'admin', 'info');

    // Step 2: Generate embeddings
    console.log('🔄 Generating embeddings...');
    const vectors = await Promise.all(
      resolvedChunks.map(async (chunk, idx) => {
        const embedding = await openaiService.createEmbedding(chunk.text);
        return {
          id: `${file.originalFilename}-chunk-${idx}`,
          values: embedding,
          metadata: {
            content: chunk.text,
            ...chunk.metadata,
            uploadedAt: new Date().toISOString(),
            uploadedBy: 'admin',
          },
        };
      })
    );

    console.log(`✅ Generated ${vectors.length} embeddings`);
    addBreadcrumb('Embeddings generated', { vectors: vectors.length }, 'admin', 'info');

    // Step 4: Upload to Pinecone
    console.log('🔄 Uploading to Pinecone...');
    const pinecone = new Pinecone({
      apiKey: appConfig.pinecone.apiKey,
    });

    const index = pinecone.index(appConfig.pinecone.indexName);

    // Upsert in batches of 100
    const batchSize = 100;
    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await index.upsert(batch);
    }

    console.log(`✅ Uploaded ${vectors.length} vectors to Pinecone`);
    addBreadcrumb('Vectors uploaded to Pinecone', { vectors: vectors.length }, 'admin', 'info');

    // Step 4: Store file in Supabase storage
    console.log('🔄 Storing file in Supabase...');
    const fileBuffer = await fs.readFile(file.filepath);
    let uploadError: Error | null = null;

    try {
      await supabaseService.uploadFile(
        fileBuffer,
        file.originalFilename!,
        file.originalFilename!,
        file.mimetype || 'application/octet-stream'
      );
      console.log(`✅ Stored file in Supabase storage`);
    } catch (error) {
      uploadError = error as Error;
      console.error('⚠️  Error uploading to Supabase:', uploadError);
      // Continue anyway since vectors are already in Pinecone
    }

    // Clean up temporary file
    if (uploadedFilePath) {
      try {
        await fs.unlink(uploadedFilePath);
      } catch (unlinkError) {
        console.error('⚠️  Error deleting temp file:', unlinkError);
      }
    }

    res.status(200).json({
      success: true,
      message: 'Document uploaded and processed successfully',
      stats: {
        filename: file.originalFilename,
        size: file.size,
        chunks: resolvedChunks.length,
        vectors: vectors.length,
        pineconeUploaded: true,
        supabaseStored: !uploadError,
      }
    });
  } catch (error) {
    console.error('❌ Error uploading document:', error);

    // Clean up temporary file on error
    if (uploadedFilePath) {
      try {
        await fs.unlink(uploadedFilePath);
      } catch (unlinkError) {
        // Ignore cleanup errors
      }
    }

    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Apply authentication and error tracking
const wrappedHandler = createErrorHandler(handler);
export default requireAuth(wrappedHandler);
