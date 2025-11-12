/**
 * TypeScript type definitions for monitoring and analytics
 */

import type * as Sentry from '@sentry/node';

// ============================================================================
// Sentry Types
// ============================================================================

export interface SentryContext {
  tags?: Record<string, string>;
  extra?: Record<string, any>;
  user?: SentryUser;
  level?: Sentry.SeverityLevel;
}

export interface SentryUser {
  id?: string;
  email?: string;
  username?: string;
  ip_address?: string;
}

export interface SentryBreadcrumb {
  message: string;
  category?: string;
  level?: Sentry.SeverityLevel;
  data?: Record<string, any>;
  timestamp?: number;
}

export interface SentryTransaction {
  name: string;
  op: string;
  description?: string;
  data?: Record<string, any>;
}

export interface RequestMetadata {
  tags: Record<string, string>;
  extra: Record<string, any>;
  user: {
    ip_address?: string;
  };
}

// ============================================================================
// Analytics Types
// ============================================================================

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
}

export interface WebVital {
  name: 'CLS' | 'FID' | 'LCP' | 'FCP' | 'TTFB' | 'INP';
  value: number;
  delta: number;
  id: string;
  rating: 'good' | 'needs-improvement' | 'poor';
}

export interface PerformanceMetric {
  page_load_time: number;
  connect_time: number;
  render_time: number;
  page: string;
}

// ============================================================================
// Custom Event Types
// ============================================================================

export interface ChatMessageEvent {
  messageLength: number;
  hasContext: boolean;
  responseTime: number;
  cached: boolean;
}

export interface DocumentUploadEvent {
  fileType: string;
  fileSize: number;
  success: boolean;
}

export interface ErrorEvent {
  errorType: string;
  errorMessage: string;
  page: string;
}

export interface AuthEvent {
  action: 'login' | 'logout' | 'failed_login';
}

export interface SessionEvent {
  action: 'start' | 'end';
  duration?: number;
}

// ============================================================================
// Monitoring Configuration Types
// ============================================================================

export interface SentryConfig {
  dsn: string;
  environment?: string;
  tracesSampleRate?: number;
  profilesSampleRate?: number;
  release?: string;
  serverName?: string;
}

export interface MonitoringConfig {
  sentry: SentryConfig;
  analytics: {
    enabled: boolean;
  };
}

// ============================================================================
// Error Handler Types
// ============================================================================

export interface ErrorHandlerOptions {
  captureContext?: boolean;
  captureUser?: boolean;
  captureRequest?: boolean;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}

export type ErrorHandler<T extends Function> = (
  handler: T,
  options?: ErrorHandlerOptions
) => T;

// ============================================================================
// Performance Monitoring Types
// ============================================================================

export interface PerformanceTransaction {
  name: string;
  op: string;
  description?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  status?: 'ok' | 'cancelled' | 'unknown' | 'invalid_argument' | 'deadline_exceeded' |
           'not_found' | 'already_exists' | 'permission_denied' | 'resource_exhausted' |
           'failed_precondition' | 'aborted' | 'out_of_range' | 'unimplemented' |
           'internal_error' | 'unavailable' | 'data_loss' | 'unauthenticated';
  tags?: Record<string, string>;
  data?: Record<string, any>;
}

export interface PerformanceSpan {
  op: string;
  description?: string;
  startTimestamp?: number;
  endTimestamp?: number;
  status?: PerformanceTransaction['status'];
  tags?: Record<string, string>;
  data?: Record<string, any>;
}

// ============================================================================
// Utility Types
// ============================================================================

export type MonitoringLevel = 'debug' | 'info' | 'warning' | 'error' | 'fatal';

export interface MonitoringMetadata {
  environment: string;
  release?: string;
  user?: SentryUser;
  tags?: Record<string, string>;
  extra?: Record<string, any>;
}
