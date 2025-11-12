import { ChatMessage } from '../types';
import { openaiService } from './openai.service';

/**
 * Streaming Service
 * Converts OpenAI streaming responses to web-standard ReadableStream
 * for incremental client delivery (reduces perceived latency from 5-10s to <1s)
 */

interface StreamChunk {
  type: 'token' | 'done' | 'error';
  content?: string;
  error?: string;
}

export class StreamingService {
  /**
   * Create a web-standard ReadableStream from OpenAI streaming chat
   * Returns both the stream and a promise that resolves to the full response text
   */
  createChatStream(
    messages: ChatMessage[],
    context?: string
  ): { stream: ReadableStream<Uint8Array>; fullResponsePromise: Promise<string> } {
    let fullResponse = '';
    let resolveFullResponse: (value: string) => void;
    let rejectFullResponse: (error: Error) => void;

    const fullResponsePromise = new Promise<string>((resolve, reject) => {
      resolveFullResponse = resolve;
      rejectFullResponse = reject;
    });

    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        try {
          await openaiService.streamChat(messages, context, (token: string) => {
            fullResponse += token;

            // Send token as SSE-formatted chunk
            const chunk: StreamChunk = { type: 'token', content: token };
            const data = `data: ${JSON.stringify(chunk)}\n\n`;
            controller.enqueue(new TextEncoder().encode(data));
          });

          // Send completion signal
          const doneChunk: StreamChunk = { type: 'done' };
          const doneData = `data: ${JSON.stringify(doneChunk)}\n\n`;
          controller.enqueue(new TextEncoder().encode(doneData));

          controller.close();
          resolveFullResponse(fullResponse);
        } catch (error) {
          const errorChunk: StreamChunk = {
            type: 'error',
            error: error instanceof Error ? error.message : 'Stream error',
          };
          const errorData = `data: ${JSON.stringify(errorChunk)}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorData));

          controller.close();
          rejectFullResponse(error instanceof Error ? error : new Error('Stream error'));
        }
      },
    });

    return { stream, fullResponsePromise };
  }

  /**
   * Helper to set SSE headers on response
   */
  setStreamingHeaders(headers: { [key: string]: string }): { [key: string]: string } {
    return {
      ...headers,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no', // Disable Nginx buffering
    };
  }
}

export const streamingService = new StreamingService();
