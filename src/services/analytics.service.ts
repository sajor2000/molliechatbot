/**
 * Analytics Service
 * Client-side analytics tracking utilities for Vercel Analytics
 * This service provides type-safe wrappers around Vercel Analytics
 */

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean>;
}

/**
 * Track a custom event
 * Only works on the client-side
 */
export function trackEvent(event: AnalyticsEvent): void {
  if (typeof window === 'undefined') {
    return; // Skip on server-side
  }

  try {
    // Check if Vercel Analytics is loaded
    if (window.va) {
      window.va('event', {
        name: event.name,
        data: event.properties,
      });
    }
  } catch (error) {
    console.error('Failed to track event:', error);
  }
}

/**
 * Track page view
 */
export function trackPageView(path?: string): void {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    if (window.va) {
      window.va('pageview', {
        path: path || window.location.pathname,
      });
    }
  } catch (error) {
    console.error('Failed to track page view:', error);
  }
}

/**
 * Track chat interaction
 */
export function trackChatMessage(properties: {
  messageLength: number;
  hasContext: boolean;
  responseTime: number;
  cached: boolean;
}): void {
  trackEvent({
    name: 'chat_message',
    properties,
  });
}

/**
 * Track document upload
 */
export function trackDocumentUpload(properties: {
  fileType: string;
  fileSize: number;
  success: boolean;
}): void {
  trackEvent({
    name: 'document_upload',
    properties,
  });
}

/**
 * Track error events
 */
export function trackError(properties: {
  errorType: string;
  errorMessage: string;
  page: string;
}): void {
  trackEvent({
    name: 'error',
    properties,
  });
}

/**
 * Track authentication events
 */
export function trackAuth(action: 'login' | 'logout' | 'failed_login'): void {
  trackEvent({
    name: 'auth',
    properties: { action },
  });
}

/**
 * Track session events
 */
export function trackSession(action: 'start' | 'end', duration?: number): void {
  trackEvent({
    name: 'session',
    properties: {
      action,
      ...(duration && { duration }),
    },
  });
}

// Extend Window interface for TypeScript
declare global {
  interface Window {
    va?: (event: string, data?: any) => void;
  }
}
