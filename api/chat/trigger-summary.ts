import type { VercelRequest, VercelResponse } from '@vercel/node';
import { supabaseDatabaseService } from '../../src/services/supabase-database.service';
import { openrouterService } from '../../src/services/openrouter.service';
import { emailService } from '../../src/services/email.service';
import { DailySummary } from '../../src/types';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    console.log('Manually triggering daily summary...');

    // Get yesterday's conversations
    const conversations = await supabaseDatabaseService.getYesterdayConversations();

    if (conversations.length === 0) {
      console.log('No conversations found for yesterday. Skipping email.');
      return res.status(200).json({
        success: true,
        message: 'No conversations found for yesterday'
      });
    }

    console.log(`Found ${conversations.length} conversations from yesterday`);

    // Calculate totals
    const totalMessages = conversations.reduce(
      (sum, conv) => sum + conv.messages.length,
      0
    );

    // Generate AI summary
    const { summary, actionItems } = await openrouterService.summarizeConversations(
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
      actionItems,
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
        actionItems: actionItems.length
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
