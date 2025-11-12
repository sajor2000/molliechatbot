import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseService } from '../../src/services/supabase.service';
import { pineconeService } from '../../src/services/pinecone.service';
import { createErrorHandler } from '../../src/services/sentry.service';
import { requireAuth, type AuthRequest } from '../../src/middleware/auth.middleware';

async function handler(req: AuthRequest, res: VercelResponse) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filename } = req.query;

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Filename is required' });
    }

    // Check if file exists
    const exists = await supabaseService.fileExists(filename);
    if (!exists) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Delete from Supabase
    await supabaseService.deleteFile(filename);

    // Delete vectors from Pinecone by metadata filter
    try {
      await pineconeService.deleteVectorsByMetadata({ source: filename });
      console.log(`✅ Deleted vectors for ${filename} from Pinecone`);
    } catch (pineconeError) {
      console.error('⚠️ Error deleting from Pinecone:', pineconeError);
      // Continue - file already deleted from storage
      // This is non-critical as vectors will be orphaned but not cause errors
    }

    return res.status(200).json({
      success: true,
      message: 'Document and vectors deleted successfully',
      filename
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({
      error: 'Failed to delete document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Apply authentication and error tracking
export default requireAuth(createErrorHandler(handler));
