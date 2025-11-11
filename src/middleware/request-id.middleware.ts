import type { VercelRequest, VercelResponse } from '@vercel/node';
import { randomUUID } from 'crypto';

/**
 * Extended VercelRequest with requestId property
 */
export interface RequestWithId extends VercelRequest {
  requestId: string;
}

/**
 * Console logger wrapper that automatically includes request ID
 */
export class RequestLogger {
  constructor(private requestId: string) {}

  log(...args: any[]): void {
    console.log(`[${this.requestId}]`, ...args);
  }

  info(...args: any[]): void {
    console.info(`[${this.requestId}]`, ...args);
  }

  warn(...args: any[]): void {
    console.warn(`[${this.requestId}]`, ...args);
  }

  error(...args: any[]): void {
    console.error(`[${this.requestId}]`, ...args);
  }

  debug(...args: any[]): void {
    console.debug(`[${this.requestId}]`, ...args);
  }
}

/**
 * Generate or extract request ID from incoming request
 * Checks for existing X-Request-ID header, otherwise generates new UUID
 */
function getOrGenerateRequestId(req: VercelRequest): string {
  const existingId = req.headers['x-request-id'];

  if (typeof existingId === 'string' && existingId.length > 0) {
    return existingId;
  }

  return randomUUID();
}

/**
 * Request ID Middleware
 *
 * Generates a unique request ID for every incoming request and makes it available
 * throughout the request lifecycle. The request ID is:
 * - Added to the request object as `req.requestId`
 * - Sent back in the response headers as `X-Request-ID`
 * - Available via a logger instance for consistent logging
 *
 * @example
 * ```typescript
 * import { withRequestId } from '../middleware/request-id.middleware';
 *
 * export default withRequestId(async (req, res) => {
 *   req.logger.log('Processing request'); // Automatically includes request ID
 *   return res.json({ requestId: req.requestId });
 * });
 * ```
 */
export function withRequestId(
  handler: (req: RequestWithId, res: VercelResponse) => Promise<void | VercelResponse>
) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Generate or extract request ID
    const requestId = getOrGenerateRequestId(req);

    // Add request ID to request object
    const requestWithId = req as RequestWithId;
    requestWithId.requestId = requestId;

    // Add logger instance to request object
    (requestWithId as any).logger = new RequestLogger(requestId);

    // Set response header
    res.setHeader('X-Request-ID', requestId);

    // Log incoming request
    console.log(`[${requestId}] ${req.method} ${req.url} - Start`);

    const startTime = Date.now();

    try {
      // Call the handler
      const result = await handler(requestWithId, res);

      // Log completion
      const duration = Date.now() - startTime;
      console.log(`[${requestId}] ${req.method} ${req.url} - Completed in ${duration}ms`);

      return result;
    } catch (error) {
      // Log error with request ID
      const duration = Date.now() - startTime;
      console.error(
        `[${requestId}] ${req.method} ${req.url} - Error after ${duration}ms:`,
        error instanceof Error ? error.message : error
      );

      // Re-throw to let error handlers deal with it
      throw error;
    }
  };
}

/**
 * Compose multiple middleware functions with request ID support
 * Ensures request ID is available throughout the entire middleware chain
 *
 * @example
 * ```typescript
 * import { composeMiddleware, withRequestId } from '../middleware/request-id.middleware';
 * import { requireAuth } from '../middleware/auth.middleware';
 * import { rateLimitChat } from '../middleware/rate-limit.middleware';
 *
 * export default composeMiddleware(
 *   withRequestId,
 *   rateLimitChat,
 *   requireAuth
 * )(async (req, res) => {
 *   req.logger.log('Authenticated request'); // Has access to logger
 *   return res.json({ success: true });
 * });
 * ```
 */
export function composeMiddleware(
  ...middlewares: Array<
    (
      handler: (req: any, res: VercelResponse) => Promise<void | VercelResponse>
    ) => (req: any, res: VercelResponse) => Promise<void | VercelResponse>
  >
) {
  return (handler: (req: RequestWithId, res: VercelResponse) => Promise<void | VercelResponse>) => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}

/**
 * Extract request ID from request object
 * Useful when you need to pass the request ID to services or other functions
 */
export function getRequestId(req: VercelRequest): string | undefined {
  return (req as RequestWithId).requestId;
}

/**
 * Create a logger instance for a given request
 * Useful when you need to create a logger in a service or utility function
 */
export function createLogger(req: VercelRequest): RequestLogger {
  const requestId = getRequestId(req) || 'unknown';
  return new RequestLogger(requestId);
}
