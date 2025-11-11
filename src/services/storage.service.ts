import fs from 'fs/promises';
import path from 'path';
import { Conversation, ChatMessage } from '../types';

export class StorageService {
  private storageDir: string;

  constructor() {
    this.storageDir = path.join(process.cwd(), 'chat-history');
    this.ensureStorageDir();
  }

  private async ensureStorageDir() {
    try {
      await fs.access(this.storageDir);
    } catch {
      await fs.mkdir(this.storageDir, { recursive: true });
    }
  }

  async saveConversation(conversation: Conversation): Promise<void> {
    const date = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const filePath = path.join(this.storageDir, `${date}.json`);

    let conversations: Conversation[] = [];
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      conversations = JSON.parse(data);
    } catch {
      // File doesn't exist yet
    }

    conversations.push(conversation);
    await fs.writeFile(filePath, JSON.stringify(conversations, null, 2));
  }

  async getConversationsByDate(date: string): Promise<Conversation[]> {
    const filePath = path.join(this.storageDir, `${date}.json`);
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      return JSON.parse(data);
    } catch {
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
    try {
      const files = await fs.readdir(this.storageDir);
      const jsonFiles = files.filter(f => f.endsWith('.json'));
      
      let allConversations: Conversation[] = [];
      for (const file of jsonFiles) {
        const filePath = path.join(this.storageDir, file);
        const data = await fs.readFile(filePath, 'utf-8');
        const conversations = JSON.parse(data);
        allConversations = allConversations.concat(conversations);
      }
      
      return allConversations;
    } catch {
      return [];
    }
  }
}

export const storageService = new StorageService();
