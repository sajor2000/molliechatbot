/**
 * Middleware Module Exports
 *
 * Central export point for all middleware functions used in the application.
 */

// Authentication middleware
export {
  generateToken,
  verifyPassword,
  verifyToken,
  revokeToken,
  requireAuth,
  type AuthRequest,
} from './auth.middleware';

// Rate limiting middleware
export {
  rateLimitAuth,
  rateLimitChat,
  rateLimitUpload,
  rateLimit,
} from './rate-limit.middleware';

// Request ID tracking middleware
export {
  withRequestId,
  composeMiddleware,
  getRequestId,
  createLogger,
  RequestLogger,
  type RequestWithId,
} from './request-id.middleware';

// CORS middleware (if needed)
// export { cors, corsMiddleware } from './cors.middleware';

// Validation middleware (if needed)
// export { validate, validateSchema } from './validation.middleware';
