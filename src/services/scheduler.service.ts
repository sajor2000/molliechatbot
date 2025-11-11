import cron from 'node-cron';
import { config } from '../config';
import { storageService } from './storage.service';
import { openrouterService } from './openrouter.service';
import { emailService } from './email.service';
import { DailySummary } from '../types';

export class SchedulerService {
  private cronExpression: string;

  constructor() {
    // Convert time like "05:30" to cron expression "30 5 * * *"
    const [hours, minutes] = config.scheduler.summaryTime.split(':');
    this.cronExpression = `${minutes} ${hours} * * *`;
  }

  start(): void {
    console.log(`Scheduler started. Daily summary will run at ${config.scheduler.summaryTime} (${config.scheduler.timezone})`);

    cron.schedule(
      this.cronExpression,
      async () => {
        console.log('Running daily summary task...');
        await this.generateAndSendDailySummary();
      },
      {
        timezone: config.scheduler.timezone,
      }
    );
  }

  async generateAndSendDailySummary(): Promise<void> {
    try {
      // Get yesterday's conversations
      const conversations = await storageService.getYesterdayConversations();

      if (conversations.length === 0) {
        console.log('No conversations found for yesterday. Skipping email.');
        return;
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
    } catch (error) {
      console.error('Error generating daily summary:', error);
      throw error;
    }
  }

  // Manual trigger for testing
  async triggerManual(): Promise<void> {
    console.log('Manually triggering daily summary...');
    await this.generateAndSendDailySummary();
  }
}

export const schedulerService = new SchedulerService();
