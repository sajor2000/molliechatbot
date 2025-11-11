import type { VercelRequest, VercelResponse } from '@vercel/node';
import { requireAuth, type AuthRequest } from '../../../src/middleware/auth.middleware';
import { supabase } from '../../../src/services/supabase.service';

async function handler(req: AuthRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // List all files from Supabase storage
    const { data: files, error: listError } = await supabase.storage
      .from('documents')
      .list('', {
        limit: 100,
        offset: 0,
        sortBy: { column: 'created_at', order: 'desc' }
      });

    if (listError) {
      console.error('Error listing files from Supabase:', listError);
      return res.status(500).json({
        error: 'Failed to list documents',
        details: listError.message
      });
    }

    // Get public URLs for each file
    const documents = files.map(file => {
      const { data: urlData } = supabase.storage
        .from('documents')
        .getPublicUrl(file.name);

      return {
        id: file.id,
        name: file.name,
        size: file.metadata?.size || 0,
        created_at: file.created_at,
        updated_at: file.updated_at,
        url: urlData.publicUrl,
      };
    });

    console.log(`✅ Listed ${documents.length} documents`);

    return res.status(200).json({
      success: true,
      documents,
      total: documents.length,
    });
  } catch (error) {
    console.error('❌ Error listing documents:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

export default requireAuth(handler);
