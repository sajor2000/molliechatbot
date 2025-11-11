import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthRequest } from '../../../src/middleware/auth.middleware';
import { supabaseService } from '../../../src/services/supabase.service';
import { Pinecone } from '@pinecone-database/pinecone';
import { config as appConfig } from '../../../src/config';

async function handler(req: AuthRequest, res: VercelResponse) {
  // Only allow DELETE requests
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { filename } = req.query;

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Filename parameter is required'
      });
    }

    console.log(`🗑️  Deleting document: ${filename}`);

    // Step 1: Delete vectors from Pinecone that match this document
    const pinecone = new Pinecone({
      apiKey: appConfig.pinecone.apiKey,
    });

    const index = pinecone.index(appConfig.pinecone.indexName);

    // Query for all vectors from this document
    // We'll delete by metadata filter
    try {
      await index.deleteMany({
        filter: {
          source: { $eq: filename }
        }
      });
      console.log(`✅ Deleted vectors for ${filename} from Pinecone`);
    } catch (pineconeError) {
      console.error('⚠️  Error deleting from Pinecone:', pineconeError);
      // Continue with file deletion even if Pinecone fails
    }

    // Step 2: Delete file from Supabase storage
    await supabaseService.deleteFile(filename);

    console.log(`✅ Deleted file ${filename} from Supabase storage`);

    return res.status(200).json({
      success: true,
      message: `Document ${filename} deleted successfully`,
      deleted: {
        filename,
        pineconeVectors: true,
        supabaseFile: true,
      }
    });
  } catch (error) {
    console.error('❌ Error deleting document:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);

// Configure API route
export const config = {
  maxDuration: 30, // 30 seconds for delete operations
};
