import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseService } from '../../src/services/supabase.service';
import { pineconeService } from '../../src/services/pinecone.service';

export default async function handler(req: VercelRequest, res: VercelResponse) {
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

    // Note: To delete from Pinecone, we would need to query vectors by metadata.source
    // and delete them. This is a limitation of the current implementation.
    // For production, consider storing vector IDs with the document metadata
    console.log(`Document ${filename} deleted from storage. Note: Pinecone vectors still exist.`);

    return res.status(200).json({
      success: true,
      message: 'Document deleted from storage',
      filename,
      note: 'Vector embeddings remain in Pinecone and will be overwritten if document is re-uploaded'
    });
  } catch (error) {
    console.error('Error deleting document:', error);
    return res.status(500).json({
      error: 'Failed to delete document',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
