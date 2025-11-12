import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { supabaseService } from '../../src/services/supabase.service';
import { pineconeService } from '../../src/services/pinecone.service';
import { embeddingService } from '../../src/services/embedding.service';
import { logger } from '../../src/services/logger.service';
import { PineconeVector } from '../../src/types/api.types';
import { createErrorHandler, addBreadcrumb } from '../../src/services/sentry.service';
import { liteDocumentService } from '../../src/services/document-lite.service';
import { config as appConfig } from '../../src/config';
import { requireAuth, type AuthRequest } from '../../src/middleware/auth.middleware';

// Disable body parsing, we'll handle it ourselves
export const config = {
  api: {
    bodyParser: false,
  },
  maxDuration: 60, // 60 seconds for document processing
};

async function handler(req: AuthRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: function ({ mimetype }) {
        // Allow PDF, Word, text, and markdown files
        return (
          mimetype === 'application/pdf' ||
          mimetype === 'text/plain' ||
          mimetype === 'text/markdown' ||
          mimetype === 'text/x-markdown' ||
          mimetype === 'application/msword' ||
          mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        );
      },
    });

    const [fields, files] = await new Promise<[formidable.Fields, formidable.Files]>(
      (resolve, reject) => {
        form.parse(req as any, (err, fields, files) => {
          if (err) reject(err);
          else resolve([fields, files]);
        });
      }
    );

    const fileArray = files.document;
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({ error: 'No file uploaded or unsupported file type (PDF, DOC, DOCX, TXT, MD only)' });
    }

    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
    const originalName = file.originalFilename || 'unknown';
    const ext = path.extname(originalName);
    const uniqueName = `${Date.now()}-${uuidv4()}${ext}`;

    const startTime = Date.now();

    // Read file buffer
    const fileBuffer = await fs.readFile(file.filepath);

    logger.document(`Processing uploaded document`, {
      filename: originalName,
      size: fileBuffer.length,
    });

    // Upload to Supabase
    const uploadedFile = await supabaseService.uploadFile(
      fileBuffer,
      uniqueName,
      originalName,
      file.mimetype || 'application/octet-stream'
    );

    const chunkOptions = {
      chunkSize: 1000,
      chunkOverlap: 200,
      preserveParagraphs: true,
    };
    const useDocling = appConfig.documentProcessing.mode === 'docling';
    logger.debug('Document chunking mode', { mode: useDocling ? 'docling' : 'lite' });

    const chunks = useDocling
      ? await (await import('../../src/services/docling.service')).doclingService.processDocument(file.filepath, chunkOptions)
      : await liteDocumentService.processDocument(file.filepath, chunkOptions);

    logger.document(`Document chunked`, {
      filename: originalName,
      chunks: chunks.length,
    });

    // Generate embeddings in parallel batches (PERFORMANCE OPTIMIZATION)
    const chunkTexts = chunks.map(c => c.text);
    const { embeddings, cachedCount, generatedCount } = await embeddingService.generateBatch({
      texts: chunkTexts,
      useCache: true,
    });

    logger.document(`Embeddings generated`, {
      filename: originalName,
      chunks: embeddings.length,
      size: cachedCount + generatedCount,
      vectors: embeddings.length
    });

    // Create vectors with embeddings
    const vectors: PineconeVector[] = chunks.map((chunk, idx) => ({
      id: uuidv4(),
      values: embeddings[idx],
      metadata: {
        text: chunk.text,
        source: uniqueName,
        originalName: originalName,
        chunkIndex: chunk.metadata.chunkIndex,
        totalChunks: chunk.metadata.totalChunks,
        pageNumber: chunk.metadata.pageNumber,
        documentType: chunk.metadata.documentType,
        uploadedAt: new Date().toISOString(),
      },
    }));

    // Upload to Pinecone in batches
    await pineconeService.upsertEmbeddings(vectors);

    // Clean up temp file
    await fs.unlink(file.filepath).catch(() => {});

    const processingTime = Date.now() - startTime;
    logger.performance('Document processing', processingTime, {
      filename: originalName,
      chunks: chunks.length,
      vectors: vectors.length,
    });

    return res.status(200).json({
      success: true,
      filename: originalName,
      storedAs: uniqueName,
      chunks: chunks.length,
      vectors: vectors.length,
      publicUrl: uploadedFile.publicUrl,
      processingTimeMs: processingTime,
      message: 'Document processed and embedded successfully',
    });
  } catch (error) {
    logger.error('Error processing document', error);
    return res.status(500).json({
      error: 'Failed to process document',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// Apply authentication and error tracking
export default requireAuth(createErrorHandler(handler));
