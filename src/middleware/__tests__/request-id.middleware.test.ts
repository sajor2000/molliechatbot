/**
 * Tests for Request ID Middleware
 *
 * These tests demonstrate how to test the request ID middleware
 * and endpoints that use it.
 */

import { VercelRequest, VercelResponse } from '@vercel/node';
import {
  withRequestId,
  RequestWithId,
  getRequestId,
  createLogger,
  composeMiddleware,
} from '../request-id.middleware';

// Mock request helper
function createMockRequest(overrides?: Partial<VercelRequest>): VercelRequest {
  return {
    headers: {},
    query: {},
    body: {},
    method: 'GET',
    url: '/test',
    ...overrides,
  } as VercelRequest;
}

// Mock response helper
function createMockResponse(): VercelResponse {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    status: function (code: number) {
      this.statusCode = code;
      return this;
    },
    json: function (data: any) {
      this.data = data;
      return this;
    },
    setHeader: function (name: string, value: string) {
      this.headers[name] = value;
      return this;
    },
    data: null,
  };
  return res as any;
}

describe('Request ID Middleware', () => {
  let consoleLogSpy: jest.SpyInstance;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  describe('withRequestId', () => {
    it('should generate a unique request ID', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const handler = withRequestId(async (req: RequestWithId, res) => {
        expect(req.requestId).toBeDefined();
        expect(typeof req.requestId).toBe('string');
        expect(req.requestId.length).toBeGreaterThan(0);
        return res.json({ success: true });
      });

      await handler(req, res);
    });

    it('should add request ID to response headers', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const handler = withRequestId(async (req: RequestWithId, res) => {
        return res.json({ success: true });
      });

      await handler(req, res);

      expect(res.headers['X-Request-ID']).toBeDefined();
      expect(typeof res.headers['X-Request-ID']).toBe('string');
    });

    it('should use existing request ID from headers', async () => {
      const existingId = 'test-request-id-123';
      const req = createMockRequest({
        headers: { 'x-request-id': existingId },
      });
      const res = createMockResponse();

      const handler = withRequestId(async (req: RequestWithId, res) => {
        expect(req.requestId).toBe(existingId);
        return res.json({ success: true });
      });

      await handler(req, res);
      expect(res.headers['X-Request-ID']).toBe(existingId);
    });

    it('should provide a logger instance', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const handler = withRequestId(async (req: RequestWithId, res) => {
        expect((req as any).logger).toBeDefined();
        expect(typeof (req as any).logger.log).toBe('function');
        expect(typeof (req as any).logger.info).toBe('function');
        expect(typeof (req as any).logger.error).toBe('function');
        return res.json({ success: true });
      });

      await handler(req, res);
    });

    it('should log request start and completion', async () => {
      const req = createMockRequest({ method: 'POST', url: '/api/test' });
      const res = createMockResponse();

      const handler = withRequestId(async (req: RequestWithId, res) => {
        return res.json({ success: true });
      });

      await handler(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('POST /api/test - Start')
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('POST /api/test - Completed')
      );
    });

    it('should log errors with request ID', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Test error');

      const handler = withRequestId(async (req: RequestWithId, res) => {
        throw error;
      });

      await expect(handler(req, res)).rejects.toThrow('Test error');

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Error'),
        expect.stringContaining('Test error')
      );
    });

    it('should measure request duration', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const handler = withRequestId(async (req: RequestWithId, res) => {
        // Simulate some work
        await new Promise((resolve) => setTimeout(resolve, 50));
        return res.json({ success: true });
      });

      await handler(req, res);

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringMatching(/Completed in \d+ms/)
      );
    });
  });

  describe('RequestLogger', () => {
    it('should prefix all log methods with request ID', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const handler = withRequestId(async (req: RequestWithId, res) => {
        const logger = (req as any).logger;

        logger.log('Log message');
        logger.info('Info message');
        logger.warn('Warn message');
        logger.error('Error message');

        return res.json({ success: true });
      });

      await handler(req, res);

      // Check that request ID is in log messages
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('['),
        'Log message'
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining('['),
        'Info message'
      );
    });
  });

  describe('getRequestId', () => {
    it('should return request ID from request object', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const handler = withRequestId(async (req: RequestWithId, res) => {
        const id = getRequestId(req);
        expect(id).toBe(req.requestId);
        return res.json({ success: true });
      });

      await handler(req, res);
    });

    it('should return undefined for requests without ID', () => {
      const req = createMockRequest();
      const id = getRequestId(req);
      expect(id).toBeUndefined();
    });
  });

  describe('createLogger', () => {
    it('should create logger with request ID', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const handler = withRequestId(async (req: RequestWithId, res) => {
        const logger = createLogger(req);

        logger.log('Test message');

        expect(consoleLogSpy).toHaveBeenCalledWith(
          expect.stringContaining('['),
          'Test message'
        );

        return res.json({ success: true });
      });

      await handler(req, res);
    });

    it('should create logger with "unknown" ID for requests without ID', () => {
      const req = createMockRequest();
      const logger = createLogger(req);

      logger.log('Test message');

      expect(consoleLogSpy).toHaveBeenCalledWith('[unknown]', 'Test message');
    });
  });

  describe('composeMiddleware', () => {
    it('should compose multiple middleware functions', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const middleware1 = (handler: any) => async (req: any, res: any) => {
        (req as any).middleware1 = true;
        return handler(req, res);
      };

      const middleware2 = (handler: any) => async (req: any, res: any) => {
        (req as any).middleware2 = true;
        return handler(req, res);
      };

      const handler = composeMiddleware(
        withRequestId,
        middleware1,
        middleware2
      )(async (req: any, res) => {
        expect(req.requestId).toBeDefined();
        expect(req.middleware1).toBe(true);
        expect(req.middleware2).toBe(true);
        return res.json({ success: true });
      });

      await handler(req, res);
    });

    it('should apply middleware in correct order', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const order: string[] = [];

      const middleware1 = (handler: any) => async (req: any, res: any) => {
        order.push('middleware1-before');
        const result = await handler(req, res);
        order.push('middleware1-after');
        return result;
      };

      const middleware2 = (handler: any) => async (req: any, res: any) => {
        order.push('middleware2-before');
        const result = await handler(req, res);
        order.push('middleware2-after');
        return result;
      };

      const handler = composeMiddleware(
        middleware1,
        middleware2
      )(async (req: any, res) => {
        order.push('handler');
        return res.json({ success: true });
      });

      await handler(req, res);

      expect(order).toEqual([
        'middleware1-before',
        'middleware2-before',
        'handler',
        'middleware2-after',
        'middleware1-after',
      ]);
    });
  });

  describe('Integration with other middleware', () => {
    it('should work with auth middleware', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      // Mock auth middleware
      const requireAuth = (handler: any) => async (req: any, res: any) => {
        (req as any).authenticated = true;
        return handler(req, res);
      };

      const handler = withRequestId(
        requireAuth(async (req: any, res) => {
          expect(req.requestId).toBeDefined();
          expect(req.authenticated).toBe(true);
          return res.json({ success: true });
        })
      );

      await handler(req, res);
    });

    it('should work with rate limit middleware', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      // Mock rate limit middleware
      const rateLimit = (handler: any) => async (req: any, res: any) => {
        (req as any).rateLimitPassed = true;
        return handler(req, res);
      };

      const handler = withRequestId(
        rateLimit(async (req: any, res) => {
          expect(req.requestId).toBeDefined();
          expect(req.rateLimitPassed).toBe(true);
          return res.json({ success: true });
        })
      );

      await handler(req, res);
    });
  });

  describe('Error scenarios', () => {
    it('should handle handler errors gracefully', async () => {
      const req = createMockRequest();
      const res = createMockResponse();
      const error = new Error('Handler error');

      const handler = withRequestId(async (req: RequestWithId, res) => {
        throw error;
      });

      await expect(handler(req, res)).rejects.toThrow('Handler error');

      expect(consoleErrorSpy).toHaveBeenCalled();
    });

    it('should include request ID in error logs', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const handler = withRequestId(async (req: RequestWithId, res) => {
        const requestId = req.requestId;
        throw new Error('Test error');
      });

      await expect(handler(req, res)).rejects.toThrow();

      const errorCall = consoleErrorSpy.mock.calls[0];
      expect(errorCall[0]).toContain('[');
      expect(errorCall[0]).toContain(']');
    });
  });

  describe('Performance', () => {
    it('should have minimal overhead', async () => {
      const req = createMockRequest();
      const res = createMockResponse();

      const startTime = Date.now();

      const handler = withRequestId(async (req: RequestWithId, res) => {
        return res.json({ success: true });
      });

      await handler(req, res);

      const duration = Date.now() - startTime;

      // Middleware should add less than 10ms overhead
      expect(duration).toBeLessThan(10);
    });
  });
});

describe('Real-world Usage Examples', () => {
  let consoleLogSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();
  });

  afterEach(() => {
    consoleLogSpy.mockRestore();
  });

  it('should handle API endpoint with error handling', async () => {
    const req = createMockRequest({ body: { data: 'test' } });
    const res = createMockResponse();

    const handler = withRequestId(async (req: RequestWithId, res) => {
      try {
        req.logger.log('Processing request');

        if (!req.body.data) {
          throw new Error('Missing data');
        }

        req.logger.log('Request processed successfully');

        return res.json({
          success: true,
          requestId: req.requestId,
        });
      } catch (error) {
        req.logger.error('Error:', error);

        return res.status(500).json({
          error: 'Internal error',
          requestId: req.requestId,
        });
      }
    });

    await handler(req, res);

    expect(res.data).toEqual({
      success: true,
      requestId: expect.any(String),
    });
    expect(res.headers['X-Request-ID']).toBeDefined();
  });

  it('should track multi-step process', async () => {
    const req = createMockRequest();
    const res = createMockResponse();

    const handler = withRequestId(async (req: RequestWithId, res) => {
      req.logger.log('Starting multi-step process');

      req.logger.info('Step 1: Validation');
      await new Promise((resolve) => setTimeout(resolve, 10));

      req.logger.info('Step 2: Processing');
      await new Promise((resolve) => setTimeout(resolve, 10));

      req.logger.info('Step 3: Completion');
      await new Promise((resolve) => setTimeout(resolve, 10));

      req.logger.log('Process completed');

      return res.json({
        success: true,
        requestId: req.requestId,
      });
    });

    await handler(req, res);

    // Verify all steps were logged
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('['),
      'Step 1: Validation'
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('['),
      'Step 2: Processing'
    );
    expect(consoleLogSpy).toHaveBeenCalledWith(
      expect.stringContaining('['),
      'Step 3: Completion'
    );
  });
});
