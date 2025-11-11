import type { VercelRequest, VercelResponse } from '@vercel/node';
import { v4 as uuidv4 } from 'uuid';
import formidable from 'formidable';
import fs from 'fs/promises';
import path from 'path';
import { supabaseService } from '../../src/services/supabase.service';
import { doclingService } from '../../src/services/docling.service';
import { pineconeService } from '../../src/services/pinecone.service';
import { openrouterService } from '../../src/services/openrouter.service';

// Disable body parsing, we'll handle it ourselves
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Parse form data
    const form = formidable({
      maxFileSize: 10 * 1024 * 1024, // 10MB limit
      filter: function ({ mimetype }) {
        // Allow PDF, text, and markdown files
        return (
          mimetype === 'application/pdf' ||
          mimetype === 'text/plain' ||
          mimetype === 'text/markdown' ||
          mimetype === 'text/x-markdown'
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
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const file = Array.isArray(fileArray) ? fileArray[0] : fileArray;
    const originalName = file.originalFilename || 'unknown';
    const ext = path.extname(originalName);
    const uniqueName = `${Date.now()}-${uuidv4()}${ext}`;

    console.log(`Processing uploaded document: ${originalName}`);

    // Read file buffer
    const fileBuffer = await fs.readFile(file.filepath);

    // Upload to Supabase
    const uploadedFile = await supabaseService.uploadFile(
      fileBuffer,
      uniqueName,
      originalName,
      file.mimetype || 'application/octet-stream'
    );

    // Process document with Docling (using temp file)
    const chunks = await doclingService.processDocument(file.filepath, {
      chunkSize: 1000,
      chunkOverlap: 200,
      preserveParagraphs: true,
    });

    // Create embeddings and upload to Pinecone
    const vectors = [];
    for (const chunk of chunks) {
      const embedding = await openrouterService.createEmbedding(chunk.text);
      vectors.push({
        id: uuidv4(),
        values: embedding,
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
      });

      // Rate limiting
      await new Promise(resolve => setTimeout(resolve, 200));
    }

    // Upload to Pinecone in batches
    const BATCH_SIZE = 100;
    for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
      const batch = vectors.slice(i, Math.min(i + BATCH_SIZE, vectors.length));
      await pineconeService.upsertEmbeddings(batch);
    }

    // Clean up temp file
    await fs.unlink(file.filepath).catch(() => {});

    return res.status(200).json({
      success: true,
      filename: originalName,
      storedAs: uniqueName,
      chunks: chunks.length,
      vectors: vectors.length,
      publicUrl: uploadedFile.publicUrl,
      message: 'Document processed and embedded successfully',
    });
  } catch (error) {
    console.error('Error processing document:', error);
    return res.status(500).json({
      error: 'Failed to process document',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}
