import type { VercelRequest, VercelResponse } from '@vercel/node';
import { verifyPassword, generateToken, storeToken } from '../../src/middleware/auth.middleware';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        error: 'Bad request',
        message: 'Password is required'
      });
    }

    // Verify password
    if (!verifyPassword(password)) {
      // Add small delay to prevent brute force attacks
      await new Promise(resolve => setTimeout(resolve, 1000));

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid password'
      });
    }

    // Generate and store token
    const token = generateToken();
    storeToken(token);

    console.log('✅ Admin authentication successful');

    return res.status(200).json({
      success: true,
      token,
      expiresIn: 86400, // 24 hours in seconds
    });
  } catch (error) {
    console.error('❌ Error during authentication:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
