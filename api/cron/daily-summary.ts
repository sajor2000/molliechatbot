import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseDatabaseService } from '../../src/services/supabase-database.service';
import { openaiService } from '../../src/services/openai.service';
import { emailService } from '../../src/services/email.service';
import { DailySummary } from '../../src/types';
import { createErrorHandler, addBreadcrumb } from '../../src/services/sentry.service';

export const config = {
  maxDuration: 60, // Pro plan allows up to 60 seconds
};

async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests (Vercel Cron uses GET)
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Security: Verify this is from Vercel Cron or authorized source
    const authHeader = req.headers['authorization'];
    const cronSecret = process.env.CRON_SECRET;

    if (!authHeader || authHeader !== `Bearer ${cronSecret}`) {
      console.error('Unauthorized cron attempt');
      return res.status(401).json({ error: 'Unauthorized' });
    }

    console.log('Running scheduled daily summary task...');
    addBreadcrumb('Cron: Daily summary started', {}, 'cron', 'info');

    // Get yesterday's conversations
    const conversations = await supabaseDatabaseService.getYesterdayConversations();

    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];

    // Handle case with NO conversations
    if (conversations.length === 0) {
      console.log('No conversations found for yesterday. Sending "no chats" email.');

      const dailySummary: DailySummary = {
        date: dateStr,
        totalConversations: 0,
        totalMessages: 0,
        summary: 'No patient chats were recorded overnight. The chatbot was available but no visitors initiated conversations.',
        todoItems: [],
        conversations: [],
      };

      // Send email even when no chats
      await emailService.sendDailySummary(dailySummary);

      console.log('No-chats email sent successfully');

      return res.status(200).json({
        success: true,
        message: 'No conversations - notification email sent',
        stats: {
          conversations: 0,
          messages: 0,
          todoItems: 0,
          date: dateStr
        }
      });
    }

    console.log(`Found ${conversations.length} conversations from yesterday`);

    // Calculate totals
    const totalMessages = conversations.reduce(
      (sum, conv) => sum + conv.messages.length,
      0
    );

    // Generate AI summary and to-do items
    const { summary, todoItems } = await openaiService.summarizeConversations(
      conversations
    );

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

    return res.status(200).json({
      success: true,
      message: 'Daily summary sent successfully',
      stats: {
        conversations: conversations.length,
        messages: totalMessages,
        todoItems: todoItems.length,
        date: dateStr
      }
    });
  } catch (error) {
    console.error('Error generating daily summary:', error);
    return res.status(500).json({
      error: 'Internal server error',
      details: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

// Apply error tracking
export default createErrorHandler(handler);
