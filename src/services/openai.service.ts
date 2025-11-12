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
 * Designed for Edge + Node runtimes using the native fetch API.
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

  private get headers(): Record<string, string> {
    return {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
    };
  }

  private normalizeError(error: unknown): Error {
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Error('OpenAI request timed out. Please try again.');
      }
      return error;
    }

    return new Error('Unexpected error communicating with OpenAI');
  }

  private async handleErrorResponse(response: Response): Promise<never> {
    let message: string | undefined;
    try {
      const data = await response.json();
      message = data?.error?.message;
    } catch {
      // Ignore JSON parse errors
    }

    if (response.status === 401) {
      throw new Error('Invalid OpenAI API key. Please check your OPENAI_API_KEY.');
    } else if (response.status === 429) {
      throw new Error('OpenAI rate limit exceeded. Please try again in a moment.');
    } else if (response.status >= 500) {
      throw new Error('OpenAI service temporarily unavailable. Please try again.');
    } else if (message) {
      throw new Error(`OpenAI API error: ${message}`);
    }

    throw new Error(`OpenAI request failed with status ${response.status}`);
  }

  private async postJson<T>(path: string, body: unknown, timeoutMs: number): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(`${this.baseURL}${path}`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      return await response.json() as T;
    } catch (error) {
      throw this.normalizeError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Create text embedding with custom dimensions
   * Uses text-embedding-3-large with 1024 dimensions for optimal Pinecone compatibility
   */
  async createEmbedding(text: string): Promise<number[]> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required for embeddings');
    }

    const payload: Record<string, any> = {
      model: this.embeddingModel,
      input: text,
    };

    if (this.embeddingDimensions) {
      payload.dimensions = this.embeddingDimensions;
    }

    console.log(`🔧 Creating embedding with model: ${payload.model}, dimensions: ${payload.dimensions}`);

    try {
      const data = await this.postJson<any>('/embeddings', payload, 30000);
      const embedding = data?.data?.[0]?.embedding;

      if (!embedding) {
        throw new Error('No embedding received from OpenAI');
      }

      return embedding;
    } catch (error) {
      console.error('❌ Error creating embedding:', error);
      throw this.normalizeError(error);
    }
  }

  /**
   * Chat completion with RAG context
   */
  async chat(messages: ChatMessage[], context?: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required for chat completions');
    }

    const apiMessages = this.buildChatMessages(messages, context);
    console.log(`💬 Sending chat request to OpenAI (${this.model})`);

    try {
      const data = await this.postJson<any>('/chat/completions', {
        model: this.model,
        messages: apiMessages,
        temperature: 0.7,
        max_tokens: 800,
      }, 60000);

      const content = data?.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No response content received from OpenAI');
      }

      const tokens = data?.usage?.total_tokens || 'unknown';
      console.log(`✅ Received response from OpenAI (${tokens} tokens)`);

      return content;
    } catch (error) {
      console.error('❌ Error in chat completion:', error);
      throw this.normalizeError(error);
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
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required for chat completions');
    }

    const apiMessages = this.buildChatMessages(messages, context);
    console.log(`💬 Streaming chat request to OpenAI (${this.model})`);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: this.headers,
        body: JSON.stringify({
          model: this.model,
          messages: apiMessages,
          temperature: 0.7,
          max_tokens: 800,
          stream: true,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        await this.handleErrorResponse(response);
      }

      if (!response.body) {
        throw new Error('OpenAI response missing body for streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) {
          break;
        }

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex = buffer.indexOf('\n');

        while (newlineIndex !== -1) {
          const line = buffer.slice(0, newlineIndex).trim();
          buffer = buffer.slice(newlineIndex + 1);
          this.processStreamLine(line, onToken);
          newlineIndex = buffer.indexOf('\n');
        }
      }

      // Flush any remaining buffered data
      buffer += decoder.decode();
      if (buffer.trim()) {
        this.processStreamLine(buffer.trim(), onToken);
      }
    } catch (error) {
      console.error('❌ Error streaming chat completion:', error);
      throw this.normalizeError(error);
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private processStreamLine(line: string, onToken: (token: string) => void): void {
    if (!line || !line.startsWith('data:')) {
      return;
    }

    const data = line.slice(5).trim();
    if (!data || data === '[DONE]') {
      return;
    }

    try {
      const parsed = JSON.parse(data);
      const delta = parsed.choices?.[0]?.delta?.content;
      if (delta) {
        onToken(delta);
      }
    } catch (error) {
      console.error('Error parsing OpenAI stream chunk:', error);
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
