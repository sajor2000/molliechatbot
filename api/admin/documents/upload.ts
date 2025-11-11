import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthRequest } from '../../../src/middleware/auth.middleware';
import formidable, { File } from 'formidable';
import { promises as fs } from 'fs';
import { doclingService } from '../../../src/services/docling.service';
import { openrouterService } from '../../../src/services/openrouter.service';
import { Pinecone } from '@pinecone-database/pinecone';
import { config as appConfig } from '../../../src/config';
import { supabaseService } from '../../../src/services/supabase.service';
import path from 'path';

export const config = {
  api: {
    bodyParser: false, // Disable default body parser for file uploads
  },
  maxDuration: 60, // 60 seconds for document processing
};

async function handler(req: AuthRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let uploadedFilePath: string | null = null;

  try {
    // Parse the multipart form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB max
      allowEmptyFiles: false,
      filter: function ({ mimetype }) {
        // Allow PDF, text, and markdown files
        return (
          mimetype === 'application/pdf' ||
          mimetype === 'text/plain' ||
          mimetype === 'text/markdown' ||
          mimetype === 'application/octet-stream' // For .md files
        );
      },
    });

    const [fields, files] = await form.parse(req);

    const fileArray = files.file;
    if (!fileArray || fileArray.length === 0) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'No file provided or invalid file type. Allowed types: PDF, TXT, MD'
      });
    }

    const file = fileArray[0] as File;
    uploadedFilePath = file.filepath;

    console.log(`📄 Processing file: ${file.originalFilename} (${file.size} bytes)`);

    // Step 1: Extract and chunk with Docling (it reads the file directly)
    console.log('🔄 Chunking document with Docling...');
    const chunks = await doclingService.processDocument(file.filepath);

    if (chunks.length === 0) {
      return res.status(400).json({
        error: 'Processing failed',
        message: 'No content could be extracted from the document'
      });
    }

    console.log(`✅ Created ${chunks.length} chunks`);

    // Step 2: Generate embeddings
    console.log('🔄 Generating embeddings...');
    const vectors = await Promise.all(
      chunks.map(async (chunk, idx) => {
        const embedding = await openrouterService.createEmbedding(chunk.text);
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

    return res.status(200).json({
      success: true,
      message: 'Document uploaded and processed successfully',
      stats: {
        filename: file.originalFilename,
        size: file.size,
        chunks: chunks.length,
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

    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
