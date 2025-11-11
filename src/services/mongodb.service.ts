import { MongoClient, Db, Collection } from 'mongodb';
import { Conversation } from '../types';
import config from '../config';

export class MongoDBService {
  private client: MongoClient | null = null;
  private db: Db | null = null;
  private conversationsCollection: Collection<Conversation> | null = null;

  constructor() {
    this.connect();
  }

  private async connect(): Promise<void> {
    try {
      if (!config.mongodbUri) {
        throw new Error('MONGODB_URI is not configured');
      }

      this.client = new MongoClient(config.mongodbUri);
      await this.client.connect();

      this.db = this.client.db(config.mongodbDatabase || 'mollieweb');
      this.conversationsCollection = this.db.collection<Conversation>('conversations');

      // Create indexes for better query performance
      await this.conversationsCollection.createIndex({ startTime: -1 });
      await this.conversationsCollection.createIndex({ id: 1 }, { unique: true });

      console.log('Connected to MongoDB successfully');
    } catch (error) {
      console.error('Failed to connect to MongoDB:', error);
      throw error;
    }
  }

  private async ensureConnection(): Promise<void> {
    if (!this.client || !this.conversationsCollection) {
      await this.connect();
    }
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    await this.ensureConnection();

    try {
      // Upsert: update if exists, insert if not
      await this.conversationsCollection!.updateOne(
        { id: conversation.id },
        { $set: conversation },
        { upsert: true }
      );
    } catch (error) {
      console.error('Error saving conversation to MongoDB:', error);
      throw error;
    }
  }

  async getConversationsByDate(date: string): Promise<Conversation[]> {
    await this.ensureConnection();

    try {
      const startDate = new Date(date);
      const endDate = new Date(date);
      endDate.setDate(endDate.getDate() + 1);

      const conversations = await this.conversationsCollection!
        .find({
          startTime: {
            $gte: startDate,
            $lt: endDate
          }
        })
        .sort({ startTime: -1 })
        .toArray();

      return conversations;
    } catch (error) {
      console.error('Error fetching conversations by date:', error);
      return [];
    }
  }

  async getYesterdayConversations(): Promise<Conversation[]> {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const dateStr = yesterday.toISOString().split('T')[0];
    return this.getConversationsByDate(dateStr);
  }

  async getAllConversations(): Promise<Conversation[]> {
    await this.ensureConnection();

    try {
      const conversations = await this.conversationsCollection!
        .find({})
        .sort({ startTime: -1 })
        .toArray();

      return conversations;
    } catch (error) {
      console.error('Error fetching all conversations:', error);
      return [];
    }
  }

  async getConversationById(id: string): Promise<Conversation | null> {
    await this.ensureConnection();

    try {
      const conversation = await this.conversationsCollection!.findOne({ id });
      return conversation;
    } catch (error) {
      console.error('Error fetching conversation by ID:', error);
      return null;
    }
  }

  async deleteOldConversations(daysToKeep: number = 90): Promise<number> {
    await this.ensureConnection();

    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const result = await this.conversationsCollection!.deleteMany({
        startTime: { $lt: cutoffDate }
      });

      return result.deletedCount || 0;
    } catch (error) {
      console.error('Error deleting old conversations:', error);
      return 0;
    }
  }

  async close(): Promise<void> {
    if (this.client) {
      await this.client.close();
      this.client = null;
      this.db = null;
      this.conversationsCollection = null;
    }
  }
}

// Singleton instance
export const mongodbService = new MongoDBService();
