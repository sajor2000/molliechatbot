import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import type { VercelRequest } from '@vercel/node';

/**
 * Sentry Error Monitoring Service
 * Provides centralized error tracking and performance monitoring
 * Only active in production environment
 */

const isProduction = process.env.NODE_ENV === 'production';
const sentryDsn = process.env.SENTRY_DSN || '';

/**
 * Initialize Sentry SDK
 * Called automatically when this module is imported
 */
export function initSentry(): void {
  // Only initialize in production and if DSN is configured
  if (!isProduction || !sentryDsn) {
    console.log('ℹ️  Sentry disabled (development mode or no DSN configured)');
    return;
  }

  try {
    Sentry.init({
      dsn: sentryDsn,
      environment: process.env.VERCEL_ENV || process.env.NODE_ENV || 'production',

      // Performance Monitoring
      tracesSampleRate: parseFloat(process.env.SENTRY_TRACES_SAMPLE_RATE || '0.1'), // 10% of transactions
      profilesSampleRate: parseFloat(process.env.SENTRY_PROFILES_SAMPLE_RATE || '0.1'), // 10% for profiling

      // Enable performance integrations
      integrations: [
        new ProfilingIntegration(),
      ],

      // Release tracking
      release: process.env.VERCEL_GIT_COMMIT_SHA,

      // Server configuration
      serverName: process.env.VERCEL_REGION || 'unknown',

      // Enhanced error details
      attachStacktrace: true,

      // Filter out sensitive information
      beforeSend(event: Sentry.Event, hint: Sentry.EventHint) {
        // Remove sensitive headers
        if (event.request?.headers) {
          delete event.request.headers['authorization'];
          delete event.request.headers['cookie'];
          delete event.request.headers['x-api-key'];
        }

        // Remove sensitive query parameters
        if (event.request?.query_string) {
          if (typeof event.request.query_string === 'string') {
            const sanitized = event.request.query_string
              .replace(/([?&])(api_?key|token|secret|password)=[^&]*/gi, '$1$2=REDACTED');
            event.request.query_string = sanitized;
          }
        }

        return event;
      },

      // Ignore common/expected errors
      ignoreErrors: [
        'AbortError',
        'Network request failed',
        'NetworkError',
        'Failed to fetch',
        'cancelled',
        'timeout',
      ],
    });

    console.log('✅ Sentry initialized successfully');
  } catch (error) {
    console.error('❌ Failed to initialize Sentry:', error);
  }
}

/**
 * Capture an exception with Sentry
 */
export function captureException(
  error: Error | unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
    user?: {
      id?: string;
      email?: string;
      username?: string;
      ip_address?: string;
    };
    level?: Sentry.SeverityLevel;
  }
): string | undefined {
  if (!isProduction || !sentryDsn) {
    console.error('Error (Sentry disabled):', error);
    return undefined;
  }

  try {
    Sentry.withScope((scope: Sentry.Scope) => {
      // Add tags
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      // Add extra context
      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      // Add user info
      if (context?.user) {
        scope.setUser(context.user);
      }

      // Set level
      if (context?.level) {
        scope.setLevel(context.level);
      }

      // Capture the exception
      return Sentry.captureException(error);
    });
  } catch (err) {
    console.error('Failed to capture exception with Sentry:', err);
    return undefined;
  }
}

/**
 * Capture a message with Sentry
 */
export function captureMessage(
  message: string,
  level: Sentry.SeverityLevel = 'info',
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, any>;
  }
): string | undefined {
  if (!isProduction || !sentryDsn) {
    console.log(`Message (Sentry disabled) [${level}]:`, message);
    return undefined;
  }

  try {
    return Sentry.withScope((scope: Sentry.Scope) => {
      if (context?.tags) {
        Object.entries(context.tags).forEach(([key, value]) => {
          scope.setTag(key, value);
        });
      }

      if (context?.extra) {
        Object.entries(context.extra).forEach(([key, value]) => {
          scope.setExtra(key, value);
        });
      }

      scope.setLevel(level);
      return Sentry.captureMessage(message, level);
    });
  } catch (err) {
    console.error('Failed to capture message with Sentry:', err);
    return undefined;
  }
}

/**
 * Add breadcrumb for request tracking
 */
export function addBreadcrumb(
  message: string,
  data?: Record<string, any>,
  category: string = 'default',
  level: Sentry.SeverityLevel = 'info'
): void {
  if (!isProduction || !sentryDsn) {
    return;
  }

  try {
    Sentry.addBreadcrumb({
      message,
      category,
      level,
      data,
      timestamp: Date.now() / 1000,
    });
  } catch (err) {
    console.error('Failed to add breadcrumb:', err);
  }
}

/**
 * Start a transaction for performance monitoring
 */
export function startTransaction(
  name: string,
  op: string,
  description?: string
): Sentry.Transaction | undefined {
  if (!isProduction || !sentryDsn) {
    return undefined;
  }

  try {
    return Sentry.startTransaction({
      name,
      op,
      description,
    });
  } catch (err) {
    console.error('Failed to start transaction:', err);
    return undefined;
  }
}

/**
 * Extract request metadata for error context
 */
export function extractRequestMetadata(req: VercelRequest): {
  tags: Record<string, string>;
  extra: Record<string, any>;
  user: {
    ip_address?: string;
  };
} {
  return {
    tags: {
      method: req.method || 'unknown',
      path: req.url || 'unknown',
      vercel_region: process.env.VERCEL_REGION || 'unknown',
    },
    extra: {
      headers: {
        'user-agent': req.headers['user-agent'],
        'referer': req.headers['referer'],
        'content-type': req.headers['content-type'],
      },
      query: req.query,
      body: sanitizeRequestBody(req.body),
    },
    user: {
      ip_address: (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
                  (req.headers['x-real-ip'] as string) ||
                  undefined,
    },
  };
}

/**
 * Sanitize request body to remove sensitive data
 */
function sanitizeRequestBody(body: any): any {
  if (!body) return body;

  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'apiKey', 'secret', 'key', 'auth'];

  Object.keys(sanitized).forEach(key => {
    if (sensitiveFields.some(field => key.toLowerCase().includes(field.toLowerCase()))) {
      sanitized[key] = '[REDACTED]';
    }
  });

  return sanitized;
}

/**
 * Flush Sentry events (important for serverless)
 * Call this at the end of serverless functions
 */
export async function flushSentry(timeout: number = 2000): Promise<boolean> {
  if (!isProduction || !sentryDsn) {
    return true;
  }

  try {
    return await Sentry.flush(timeout);
  } catch (err) {
    console.error('Failed to flush Sentry:', err);
    return false;
  }
}

/**
 * Create error handler middleware for API routes
 */
export function createErrorHandler<T extends Function>(handler: T): T {
  return (async (req: VercelRequest, ...args: any[]) => {
    const transaction = startTransaction(
      req.url || 'unknown',
      'http.server',
      `${req.method} ${req.url}`
    );

    try {
      // Add breadcrumb for the request
      addBreadcrumb(
        `API Request: ${req.method} ${req.url}`,
        {
          method: req.method,
          path: req.url,
          query: req.query,
        },
        'http',
        'info'
      );

      // Execute the handler
      const result = await handler(req, ...args);

      transaction?.setStatus('ok');
      transaction?.finish();

      return result;
    } catch (error) {
      // Capture the error with full context
      const metadata = extractRequestMetadata(req);
      captureException(error, {
        ...metadata,
        level: 'error',
        extra: {
          ...metadata.extra,
          handler_name: handler.name,
        },
      });

      transaction?.setStatus('internal_error');
      transaction?.finish();

      // Re-throw to be handled by route's error handler
      throw error;
    } finally {
      // Ensure events are sent in serverless environment
      await flushSentry();
    }
  }) as unknown as T;
}

/**
 * Set user context for the current scope
 */
export function setUser(user: {
  id?: string;
  email?: string;
  username?: string;
  ip_address?: string;
}): void {
  if (!isProduction || !sentryDsn) {
    return;
  }

  try {
    Sentry.setUser(user);
  } catch (err) {
    console.error('Failed to set user context:', err);
  }
}

/**
 * Clear user context
 */
export function clearUser(): void {
  if (!isProduction || !sentryDsn) {
    return;
  }

  try {
    Sentry.setUser(null);
  } catch (err) {
    console.error('Failed to clear user context:', err);
  }
}

// Initialize Sentry when this module is imported
initSentry();

// Export Sentry SDK for advanced usage
export { Sentry };
