import type { VercelRequest, VercelResponse } from '@vercel/node';
import { processDocument } from '../../../src/utils/documentProcessor';

/**
 * Serverless Document Processing API
 *
 * Upload and process documents (PDF, MD, TXT) directly from Vercel
 * Chunks text, generates OpenAI embeddings, and uploads to Pinecone
 *
 * POST /api/admin/documents/process
 *
 * Body: multipart/form-data
 *   - file: PDF, Markdown, or Text file
 *   - adminKey: Admin authentication key (CRON_SECRET)
 *
 * Response:
 *   - success: boolean
 *   - chunks: number of vectors created
 *   - message: status message
 */
export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed',
      message: 'Use POST to upload documents',
    });
  }

  try {
    // Authentication check
    const adminKey = req.headers['x-admin-key'] || req.body?.adminKey;
    const expectedKey = process.env.CRON_SECRET;

    if (!adminKey || adminKey !== expectedKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid admin key',
      });
    }

    // Parse multipart form data
    const contentType = req.headers['content-type'] || '';

    if (!contentType.includes('multipart/form-data')) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Content-Type must be multipart/form-data',
      });
    }

    // Get file from request
    // Note: Vercel automatically parses multipart/form-data in req.body
    const fileData = req.body?.file;
    const filename = req.body?.filename || 'uploaded-document';

    if (!fileData) {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'No file provided. Send file data in "file" field.',
      });
    }

    // Detect file type from filename extension
    let fileType: 'pdf' | 'markdown' | 'text' = 'text';
    const ext = filename.toLowerCase().split('.').pop();

    if (ext === 'pdf') {
      fileType = 'pdf';
    } else if (ext === 'md' || ext === 'markdown') {
      fileType = 'markdown';
    }

    // Convert file data to Buffer
    let buffer: Buffer;
    if (Buffer.isBuffer(fileData)) {
      buffer = fileData;
    } else if (typeof fileData === 'string') {
      // If base64 encoded
      buffer = Buffer.from(fileData, 'base64');
    } else if (fileData.data && Array.isArray(fileData.data)) {
      buffer = Buffer.from(fileData.data);
    } else {
      return res.status(400).json({
        error: 'Bad Request',
        message: 'Invalid file data format',
      });
    }

    console.log(`Processing ${filename} (${fileType}) - ${buffer.length} bytes`);

    // Process the document
    const result = await processDocument(buffer, filename, fileType);

    return res.status(200).json({
      success: true,
      ...result,
    });

  } catch (error: any) {
    console.error('Document processing error:', error);

    return res.status(500).json({
      error: 'Processing failed',
      message: error.message || 'Unknown error occurred',
    });
  }
}

// Configure API route
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb', // Max file size
    },
  },
  maxDuration: 60, // 60 seconds max execution time
};
