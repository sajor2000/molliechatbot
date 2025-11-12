import axios from 'axios';
import { config } from '../config';
import { ChatMessage } from '../types';
import SYSTEM_PROMPT from '../config/system-prompt';

/**
 * OpenAI Service
 *
 * Handles direct communication with OpenAI API for:
 * - Chat completions (gpt-4o-mini)
 * - Text embeddings (text-embedding-3-large with 1024 dimensions)
 *
 * Benefits over OpenRouter:
 * - 15-20% cost savings (no markup)
 * - Better rate limits (500 RPM vs 10 RPM)
 * - Faster response times (~100-200ms improvement)
 * - Single API key management
 * - Higher reliability for production
 */
export class OpenAIService {
  private apiKey: string;
  private model: string;
  private embeddingModel: string;
  private embeddingDimensions: number;
  private baseURL = 'https://api.openai.com/v1';

  constructor() {
    this.apiKey = config.openai.apiKey;
    this.model = config.openai.model;
    this.embeddingModel = config.openai.embeddingModel;
    this.embeddingDimensions = config.openai.embeddingDimensions;
  }

  /**
   * Build system + user/assistant messages with optional RAG context
   */
  private buildChatMessages(messages: ChatMessage[], context?: string) {
    let systemContent = SYSTEM_PROMPT;

    if (context) {
      systemContent += `\n\n## Knowledge Base Context\n\nUse the following information from our knowledge base to provide accurate, detailed answers:\n\n${context}`;
    }

    const systemMessage = {
      role: 'system',
      content: systemContent,
    };

    return [
      systemMessage,
      ...messages.map(m => ({
        role: m.role === 'assistant' ? 'assistant' : m.role,
        content: m.content,
      })),
    ];
  }

  /**
   * Create text embedding with custom dimensions
   * Uses text-embedding-3-large with 1024 dimensions for optimal Pinecone compatibility
   */
  async createEmbedding(text: string): Promise<number[]> {
    try {
      if (!this.apiKey) {
        throw new Error('OPENAI_API_KEY is required for embeddings');
      }

      const payload: any = {
        model: this.embeddingModel, // text-embedding-3-large
        input: text,
      };

      // Include dimensions (1024 for Pinecone index)
      if (this.embeddingDimensions) {
        payload.dimensions = this.embeddingDimensions;
      }

      console.log(`🔧 Creating embedding with model: ${payload.model}, dimensions: ${payload.dimensions}`);

      const response = await axios.post(`${this.baseURL}/embeddings`, payload, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 second timeout
      });

      const embedding = response.data?.data?.[0]?.embedding;
      if (!embedding) {
        throw new Error('No embedding received from OpenAI');
      }
      return embedding;
    } catch (error) {
      // Handle Axios errors with specific messages
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message;

        if (status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY.');
        } else if (status === 429) {
          throw new Error('OpenAI rate limit exceeded. Please try again in a moment.');
        } else if (status && status >= 500) {
          throw new Error('OpenAI service temporarily unavailable. Please try again.');
        } else if (message) {
          throw new Error(`OpenAI API error: ${message}`);
        }
      }

      console.error('❌ Error creating embedding:', error);
      throw new Error('Failed to create embedding. Please try again.');
    }
  }

  /**
   * Chat completion with RAG context
   * Uses OpenAI Chat Completions API directly
   */
  async chat(messages: ChatMessage[], context?: string): Promise<string> {
    try {
      if (!this.apiKey) {
        throw new Error('OPENAI_API_KEY is required for chat completions');
      }

      const apiMessages = this.buildChatMessages(messages, context);

      console.log(`💬 Sending chat request to OpenAI (${this.model})`);

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model, // gpt-4o-mini
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 800,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout for chat completions
        }
      );

      const content = response.data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }

      const tokens = response.data?.usage?.total_tokens || 'unknown';
      console.log(`✅ Received response from OpenAI (${tokens} tokens)`);

      return content;
    } catch (error) {
      // Handle Axios errors with specific messages
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message;

        if (status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY.');
        } else if (status === 429) {
          throw new Error('OpenAI rate limit exceeded. Please try again in a moment.');
        } else if (status && status >= 500) {
          throw new Error('OpenAI service temporarily unavailable. Please try again.');
        } else if (message) {
          throw new Error(`OpenAI API error: ${message}`);
        }
      }

      console.error('❌ Error in chat completion:', error);
      throw new Error('Failed to complete chat request. Please try again.');
    }
  }

  /**
   * Stream chat completion tokens
   */
  async streamChat(
    messages: ChatMessage[],
    context: string | undefined,
    onToken: (token: string) => void
  ): Promise<void> {
    try {
      if (!this.apiKey) {
        throw new Error('OPENAI_API_KEY is required for chat completions');
      }

      const apiMessages = this.buildChatMessages(messages, context);
      console.log(`💬 Streaming chat request to OpenAI (${this.model})`);

      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 800,
          stream: true,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          responseType: 'stream',
        }
      );

      const stream = response.data as NodeJS.ReadableStream;

      await new Promise<void>((resolve, reject) => {
        let buffer = '';
        let resolved = false;

        const processLine = (rawLine: string) => {
          const line = rawLine.trim();
          if (!line || !line.startsWith('data:')) {
            return;
          }

          const data = line.slice(5).trim();
          if (!data) {
            return;
          }

          if (data === '[DONE]') {
            resolved = true;
            cleanup();
            resolve();
            return;
          }

          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              onToken(delta);
            }
          } catch (err) {
            console.error('Error parsing OpenAI stream chunk:', err);
          }
        };

        const handleData = (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          let newlineIndex = buffer.indexOf('\n');

          while (newlineIndex !== -1) {
            const line = buffer.slice(0, newlineIndex);
            buffer = buffer.slice(newlineIndex + 1);
            processLine(line);
            newlineIndex = buffer.indexOf('\n');
          }
        };

        const handleEnd = () => {
          if (buffer.trim()) {
            processLine(buffer);
          }
          cleanup();
          if (!resolved) {
            resolve();
          }
        };

        const handleError = (err: Error) => {
          cleanup();
          reject(err);
        };

        const cleanup = () => {
          stream.removeListener('data', handleData);
          stream.removeListener('end', handleEnd);
          stream.removeListener('error', handleError);
          // For Node.js streams, destroy if available
          if ('destroy' in stream && typeof stream.destroy === 'function') {
            stream.destroy();
          }
        };

        stream.on('data', handleData);
        stream.on('end', handleEnd);
        stream.on('error', handleError);
      });
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const status = error.response?.status;
        const message = error.response?.data?.error?.message;

        if (status === 401) {
          throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY.');
        } else if (status === 429) {
          throw new Error('OpenAI rate limit exceeded. Please try again in a moment.');
        } else if (status && status >= 500) {
          throw new Error('OpenAI service temporarily unavailable. Please try again.');
        } else if (message) {
          throw new Error(`OpenAI API error: ${message}`);
        }
      }

      console.error('❌ Error streaming chat completion:', error);
      throw new Error('Failed to stream chat request. Please try again.');
    }
  }

  /**
   * Summarize conversations for daily email reports
   * Uses chat completion to analyze and extract key information
   */
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
      console.error('❌ Error summarizing conversations:', error);
      throw error;
    }
  }
}

export const openaiService = new OpenAIService();
