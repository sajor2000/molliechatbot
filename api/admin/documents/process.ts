import type { VercelRequest, VercelResponse } from '@vercel/node';
import formidable, { File } from 'formidable';
import { promises as fs } from 'fs';
import { processDocument } from '../../../src/utils/documentProcessor';
import { createErrorHandler } from '../../../src/services/sentry.service';

/**
 * Serverless Document Processing API
 *
 * Upload and process documents (PDF, MD, TXT) directly from Vercel
 * Chunks text, generates OpenAI embeddings, and uploads to Pinecone
 *
 * POST /api/admin/documents/process
 *
 * Body: multipart/form-data
 *   - file: PDF, Markdown, or Text file (max 5MB - Vercel limit)
 *   - adminKey: Admin authentication key (CRON_SECRET) - optional if using header
 *
 * Headers:
 *   - x-admin-key: Admin authentication key (CRON_SECRET)
 *
 * Response:
 *   - success: boolean
 *   - chunks: number of vectors created
 *   - message: status message
 */
async function handler(
  req: VercelRequest,
  res: VercelResponse
): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed',
      message: 'Use POST to upload documents',
    });
    return;
  }

  try {
    // Authentication check - check header first
    const adminKey = req.headers['x-admin-key'] as string;
    const expectedKey = process.env.CRON_SECRET;

    if (!adminKey || adminKey !== expectedKey) {
      res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid admin key. Provide x-admin-key header.',
      });
      return;
    }

    // Parse multipart form data using formidable
    const form = formidable({
      maxFileSize: 5 * 1024 * 1024, // 5MB max (Vercel serverless limit)
      allowEmptyFiles: false,
      filter: function ({ mimetype }) {
        // Allow PDF, text, and markdown files
        return (
          mimetype === 'application/pdf' ||
          mimetype === 'text/plain' ||
          mimetype === 'text/markdown' ||
          mimetype === 'application/octet-stream'
        );
      },
    });

    // Parse the incoming request
    const [fields, files] = await form.parse(req);

    // Check if file was uploaded
    if (!files.file || files.file.length === 0) {
      res.status(400).json({
        error: 'Bad Request',
        message: 'No file provided. Use "file" field in form data.',
      });
      return;
    }

    const file = files.file[0] as File;
    const filename = file.originalFilename || 'uploaded-document';

    // Detect file type from filename extension
    let fileType: 'pdf' | 'markdown' | 'text' = 'text';
    const ext = filename.toLowerCase().split('.').pop();

    if (ext === 'pdf') {
      fileType = 'pdf';
    } else if (ext === 'md' || ext === 'markdown') {
      fileType = 'markdown';
    }

    console.log(`Processing ${filename} (${fileType}) - ${file.size} bytes`);

    // Read file from temporary location
    const buffer = await fs.readFile(file.filepath);

    // Process the document
    const result = await processDocument(buffer, filename, fileType);

    // Clean up temporary file
    try {
      await fs.unlink(file.filepath);
    } catch (cleanupError) {
      console.error('Temp file cleanup error:', cleanupError);
      // Don't fail the request if cleanup fails
    }

    res.status(200).json(result);
    return;

  } catch (error: any) {
    console.error('Document processing error:', error);

    // Handle specific errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({
        error: 'File too large',
        message: 'File size must be less than 5MB (Vercel limit)',
      });
      return;
    }

    if (error.message && error.message.includes('mimetype')) {
      res.status(400).json({
        error: 'Invalid file type',
        message: 'Only PDF, Markdown, and Text files are supported',
      });
      return;
    }

    res.status(500).json({
      error: 'Processing failed',
      message: error.message || 'Unknown error occurred',
    });
  }
}

// Apply error tracking
export default createErrorHandler(handler);

// Configure API route - MUST disable bodyParser for file uploads
export const config = {
  api: {
    bodyParser: false, // Required for multipart/form-data file uploads
  },
  maxDuration: 60, // 60 seconds max execution time
};
