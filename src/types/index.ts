export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export interface Conversation {
  id: string;
  messages: ChatMessage[];
  startTime: Date;
  endTime?: Date;
  metadata?: {
    userAgent?: string;
    ipAddress?: string;
    sessionId?: string;
  };
}

export interface RAGContext {
  content: string;
  score: number;
  metadata?: Record<string, any>;
}

export interface DailySummary {
  date: string;
  totalConversations: number;
  totalMessages: number;
  summary: string;
  todoItems: string[]; // Changed from actionItems to todoItems
  conversations: Conversation[];
}
