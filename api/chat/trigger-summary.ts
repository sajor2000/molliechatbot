import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseDatabaseService } from '../../src/services/supabase-database.service';
import { openaiService } from '../../src/services/openai.service';
import { emailService } from '../../src/services/email.service';
import { DailySummary } from '../../src/types';
import { createErrorHandler } from '../../src/services/sentry.service';
import { requireAuth, type AuthRequest } from '../../src/middleware/auth.middleware';

async function handler(req: AuthRequest, res: VercelResponse): Promise<void> {
  // Only allow POST requests
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  try {
    console.log('Manually triggering daily summary...');

    // Get yesterday's conversations
    const conversations = await supabaseDatabaseService.getYesterdayConversations();

    if (conversations.length === 0) {
      console.log('No conversations found for yesterday. Skipping email.');
      res.status(200).json({
        success: true,
        message: 'No conversations found for yesterday'
      });
      return;
    }

    console.log(`Found ${conversations.length} conversations from yesterday`);

    // Calculate totals
    const totalMessages = conversations.reduce(
      (sum, conv) => sum + conv.messages.length,
      0
    );

    // Generate AI summary
    const { summary, todoItems } = await openaiService.summarizeConversations(
      conversations
    );

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    const dailySummary: DailySummary = {
      date: dateStr,
      totalConversations: conversations.length,
      totalMessages,
      summary,
      todoItems,
      conversations,
    };

    // Send email
    await emailService.sendDailySummary(dailySummary);

    console.log('Daily summary completed successfully');

    res.status(200).json({
      success: true,
      message: 'Daily summary sent successfully',
      stats: {
        conversations: conversations.length,
        messages: totalMessages,
        todoItems: todoItems.length
      }
    });
  } catch (error) {
    console.error('Error generating daily summary:', error);
    res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Apply authentication and error tracking
export default requireAuth(createErrorHandler(handler));
