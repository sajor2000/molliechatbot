import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyPassword, generateToken } from '../../src/middleware/auth.middleware';
import { rateLimitAuth } from '../../src/middleware/rate-limit.middleware';

async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (!password || typeof password !== 'string') {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Password is required'
      });
    }

    // Verify password using bcrypt
    const isValid = await verifyPassword(password);

    if (!isValid) {
      // Add small delay to prevent brute force attacks (increased from 1s to 3s)
      await new Promise(resolve => setTimeout(resolve, 3000));

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid password'
      });
    }

    // Generate and store token in KV
    const token = await generateToken();

    console.log('✅ Admin authentication successful');

    return res.status(200).json({
      success: true,
      token,
      expiresIn: 86400, // 24 hours in seconds
    });
  } catch (error) {
    console.error('❌ Error during authentication:', error);

    // Hide internal error details in production
    if (process.env.NODE_ENV === 'production') {
      return res.status(500).json({
        error: 'Authentication failed'
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Apply rate limiting: 5 attempts per 15 minutes
export default rateLimitAuth(handler);
