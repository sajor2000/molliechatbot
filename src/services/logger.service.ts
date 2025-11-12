import { addBreadcrumb } from './sentry.service';

/**
 * Structured Logging Service
 * Provides environment-aware logging with Sentry integration
 * Reduces console.log noise in production while maintaining debugging capability
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: any;
}

class LoggerService {
  private isProduction = process.env.NODE_ENV === 'production';

  /**
   * Debug level - only logs in development
   */
  debug(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.log(`🔍 [DEBUG] ${message}`, context || '');
    }
    addBreadcrumb(message, context, 'debug', 'debug');
  }

  /**
   * Info level - logs in development, breadcrumb in production
   */
  info(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.log(`ℹ️  [INFO] ${message}`, context || '');
    }
    addBreadcrumb(message, context, 'info', 'info');
  }

  /**
   * Warning level - always logs, adds breadcrumb
   */
  warn(message: string, context?: LogContext): void {
    console.warn(`⚠️  [WARN] ${message}`, context || '');
    addBreadcrumb(message, context, 'warning', 'warning');
  }

  /**
   * Error level - always logs, adds breadcrumb, captures error
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`❌ [ERROR] ${message}`, { error: errorMessage, ...context });

    addBreadcrumb(
      message,
      { error: errorMessage, ...context },
      'error',
      'error'
    );
  }

  /**
   * Success level - logs in development
   */
  success(message: string, context?: LogContext): void {
    if (!this.isProduction) {
      console.log(`✅ [SUCCESS] ${message}`, context || '');
    }
    addBreadcrumb(message, context, 'default', 'info');
  }

  /**
   * Request logging - captures HTTP request details
   */
  request(method: string, path: string, context?: LogContext): void {
    const message = `${method} ${path}`;
    this.debug(message, context);
  }

  /**
   * Performance logging - captures timing information
   */
  performance(operation: string, durationMs: number, context?: LogContext): void {
    const message = `${operation} completed in ${durationMs}ms`;

    if (durationMs > 5000) {
      this.warn(`Slow operation: ${message}`, context);
    } else {
      this.debug(message, context);
    }
  }

  /**
   * Cache logging helper
   */
  cache(hit: boolean, key: string): void {
    const message = hit ? `Cache hit: ${key}` : `Cache miss: ${key}`;
    this.debug(message, { cacheHit: hit, cacheKey: key });
  }

  /**
   * RAG logging helper
   */
  rag(message: string, stats: {
    chunks?: number;
    similarityScore?: number;
    reranked?: boolean;
  }): void {
    this.info(`RAG: ${message}`, stats);
  }

  /**
   * Document processing logging
   */
  document(message: string, stats: {
    filename?: string;
    chunks?: number;
    vectors?: number;
    size?: number;
  }): void {
    this.info(`Document: ${message}`, stats);
  }
}

// Export singleton instance
export const logger = new LoggerService();
