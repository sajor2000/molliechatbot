import { Router, Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs/promises';
import { v4 as uuidv4 } from 'uuid';
import { doclingService } from '../services/docling.service';
import { pineconeService } from '../services/pinecone.service';
import { openrouterService } from '../services/openrouter.service';

const router = Router();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(process.cwd(), 'documents');
    try {
      await fs.access(uploadDir);
    } catch {
      await fs.mkdir(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedExtensions = ['.pdf', '.txt', '.md'];
    const ext = path.extname(file.originalname).toLowerCase();
    
    if (allowedExtensions.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Unsupported file type. Allowed: ${allowedExtensions.join(', ')}`));
    }
  },
});

/**
 * Upload and process a single document
 * POST /api/documents/upload
 */
router.post('/upload', upload.single('document'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const filePath = req.file.path;
    const filename = req.file.filename;

    console.log(`Processing uploaded document: ${filename}`);

    // Process document with Docling
    const chunks = await doclingService.processDocument(filePath, {
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
          source: filename,
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

    res.json({
      success: true,
      filename: req.file.originalname,
      chunks: chunks.length,
      vectors: vectors.length,
      message: 'Document processed and embedded successfully',
    });
  } catch (error) {
    console.error('Error processing document:', error);
    res.status(500).json({ 
      error: 'Failed to process document',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Upload and process multiple documents
 * POST /api/documents/upload-batch
 */
router.post('/upload-batch', upload.array('documents', 10), async (req: Request, res: Response) => {
  try {
    const files = req.files as Express.Multer.File[];
    
    if (!files || files.length === 0) {
      return res.status(400).json({ error: 'No files uploaded' });
    }

    const results = [];

    for (const file of files) {
      try {
        console.log(`Processing: ${file.filename}`);

        // Process document
        const chunks = await doclingService.processDocument(file.path, {
          chunkSize: 1000,
          chunkOverlap: 200,
          preserveParagraphs: true,
        });

        // Create embeddings
        const vectors = [];
        for (const chunk of chunks) {
          const embedding = await openrouterService.createEmbedding(chunk.text);
          vectors.push({
            id: uuidv4(),
            values: embedding,
            metadata: {
              text: chunk.text,
              source: file.filename,
              chunkIndex: chunk.metadata.chunkIndex,
              totalChunks: chunk.metadata.totalChunks,
              pageNumber: chunk.metadata.pageNumber,
              documentType: chunk.metadata.documentType,
              uploadedAt: new Date().toISOString(),
            },
          });

          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Upload to Pinecone
        const BATCH_SIZE = 100;
        for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
          const batch = vectors.slice(i, Math.min(i + BATCH_SIZE, vectors.length));
          await pineconeService.upsertEmbeddings(batch);
        }

        results.push({
          filename: file.originalname,
          chunks: chunks.length,
          vectors: vectors.length,
          success: true,
        });
      } catch (error) {
        results.push({
          filename: file.originalname,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    res.json({
      success: true,
      processed: results.length,
      results,
    });
  } catch (error) {
    console.error('Error processing documents:', error);
    res.status(500).json({ 
      error: 'Failed to process documents',
      details: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * List uploaded documents
 * GET /api/documents/list
 */
router.get('/list', async (req: Request, res: Response) => {
  try {
    const documentsDir = path.join(process.cwd(), 'documents');
    
    try {
      await fs.access(documentsDir);
    } catch {
      return res.json({ documents: [] });
    }

    const files = await fs.readdir(documentsDir);
    const documents = await Promise.all(
      files.map(async (filename) => {
        const filePath = path.join(documentsDir, filename);
        const stats = await fs.stat(filePath);
        return {
          filename,
          size: stats.size,
          uploadedAt: stats.birthtime,
          extension: path.extname(filename),
        };
      })
    );

    res.json({ documents });
  } catch (error) {
    console.error('Error listing documents:', error);
    res.status(500).json({ error: 'Failed to list documents' });
  }
});

/**
 * Delete a document and its embeddings
 * DELETE /api/documents/:filename
 */
router.delete('/:filename', async (req: Request, res: Response) => {
  try {
    const { filename } = req.params;
    const filePath = path.join(process.cwd(), 'documents', filename);

    // Check if file exists
    try {
      await fs.access(filePath);
    } catch {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete file
    await fs.unlink(filePath);

    // Note: To delete from Pinecone, you'd need to track vector IDs by filename
    // For now, we just delete the file
    // In production, consider storing a mapping of filename -> vector IDs

    res.json({
      success: true,
      message: 'Document deleted',
      filename,
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
