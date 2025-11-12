import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseService } from '../../src/services/supabase.service';
import { createErrorHandler } from '../../src/services/sentry.service';
import { requireAuth, type AuthRequest } from '../../src/middleware/auth.middleware';

async function handler(req: AuthRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const documents = await supabaseService.listFiles();

    return res.status(200).json({
      success: true,
      documents: documents.map(doc => ({
        filename: doc.filename,
        originalName: doc.originalName,
        size: doc.size,
        uploadedAt: doc.uploadedAt,
        extension: doc.extension,
        publicUrl: doc.publicUrl,
      }))
    });
  } catch (error) {
    console.error('Error listing documents:', error);
    return res.status(500).json({
      error: 'Failed to list documents',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Apply authentication and error tracking
export default requireAuth(createErrorHandler(handler));
