import axios from 'axios';
import { config } from '../config';
import { ChatMessage } from '../types';
import SYSTEM_PROMPT from '../config/system-prompt';

export class OpenRouterService {
  private apiKey: string;
  private model: string;
  private baseURL = 'https://openrouter.ai/api/v1';

  constructor() {
    this.apiKey = config.openrouter.apiKey;
    this.model = config.openrouter.model;
  }

  async createEmbedding(text: string): Promise<number[]> {
    try {
      // Use OpenAI API directly for embeddings to support dimensions parameter
      const openaiApiKey = config.openai.apiKey;

      if (!openaiApiKey) {
        throw new Error('OPENAI_API_KEY is required for embeddings with custom dimensions');
      }

      const payload: any = {
        model: config.openrouter.embeddingModel, // text-embedding-3-large
        input: text,
      };

      // Include dimensions (1024 for text-embedding-3-large)
      if (config.openrouter.embeddingDimensions) {
        payload.dimensions = config.openrouter.embeddingDimensions;
      }

      console.log(`🔧 Creating embedding with model: ${payload.model}, dimensions: ${payload.dimensions}`);

      const response = await axios.post('https://api.openai.com/v1/embeddings', payload, {
        headers: {
          'Authorization': `Bearer ${openaiApiKey}`,
          'Content-Type': 'application/json',
        },
      });
      return response.data.data[0].embedding;
    } catch (error) {
      console.error('Error creating embedding:', error);
      throw error;
    }
  }

  async chat(messages: ChatMessage[], context?: string): Promise<string> {
    try {
      // Build system message with Shoreline Dental persona and RAG context
      let systemContent = SYSTEM_PROMPT;

      if (context) {
        systemContent += `\n\n## Knowledge Base Context\n\nUse the following information from our knowledge base to provide accurate, detailed answers:\n\n${context}`;
      }

      const systemMessage: ChatMessage = {
        role: 'system',
        content: systemContent,
        timestamp: new Date(),
      };

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            systemMessage,
            ...messages.map(m => ({ role: m.role, content: m.content })),
          ],
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://yourdomain.com',
            'X-Title': 'Mollieweb Chatbot',
          },
        }
      );

      return response.data.choices[0].message.content;
    } catch (error) {
      console.error('Error in chat completion:', error);
      throw error;
    }
  }

  async summarizeConversations(conversations: any[]): Promise<{ summary: string; todoItems: string[] }> {
    const conversationTexts = conversations.map((conv, idx) => {
      const messages = conv.messages
        .map((m: ChatMessage) => `${m.role}: ${m.content}`)
        .join('\n');
      return `Conversation ${idx + 1} (${new Date(conv.startTime).toLocaleString()}):\n${messages}\n`;
    }).join('\n---\n\n');

    const prompt = `You are analyzing patient/customer conversations from Shoreline Dental Chicago's website chatbot from the past day.

Analyze the following conversations and provide:

1. **Summary**: A comprehensive summary of:
   - Key themes and patterns
   - Common patient questions and concerns
   - Types of services patients are interested in
   - Any urgent or time-sensitive inquiries

2. **To-Do Items**: Specific, actionable tasks for the dental office managers (Anel and Mollie) for TODAY:
   - Follow-ups needed with specific patients
   - Questions that require staff attention
   - Appointment booking requests
   - Issues or complaints to address
   - Information gaps in the chatbot's knowledge base

Format each to-do item clearly and concisely (one sentence max).

Conversations:
${conversationTexts}

Please format your response as JSON with the following structure:
{
  "summary": "your comprehensive summary here",
  "todoItems": ["specific actionable task 1", "specific actionable task 2", ...]
}`;

    try {
      const response = await this.chat([
        { role: 'user', content: prompt, timestamp: new Date() }
      ]);

      // Try to parse JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }

      // Fallback if JSON parsing fails
      return {
        summary: response,
        todoItems: [],
      };
    } catch (error) {
      console.error('Error summarizing conversations:', error);
      throw error;
    }
  }
}

export const openrouterService = new OpenRouterService();
