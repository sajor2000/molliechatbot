import type { VercelResponse } from '@vercel/node';
import { requireAuth, type AuthRequest } from '../../../src/middleware/auth.middleware';
import { supabaseService } from '../../../src/services/supabase.service';
import { createErrorHandler } from '../../../src/services/sentry.service';

async function handler(req: AuthRequest, res: VercelResponse): Promise<void> {
  // Only allow GET requests
  if (req.method !== 'GET') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    // List all files from Supabase storage
    const files = await supabaseService.listFiles();

    // Map to expected format
    const documents = files.map(file => ({
      id: file.filename,
      name: file.originalName,
      size: file.size,
      created_at: file.uploadedAt.toISOString(),
      updated_at: file.uploadedAt.toISOString(),
      url: file.publicUrl,
    }));

    console.log(`✅ Listed ${documents.length} documents`);

    res.status(200).json({
      success: true,
      documents,
      total: documents.length,
    });
  } catch (error) {
    console.error('❌ Error listing documents:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Apply authentication and error tracking
const wrappedHandler = createErrorHandler(handler);
export default requireAuth(wrappedHandler);

// Configure API route
export const config = {
  maxDuration: 30, // 30 seconds for list operations
};
