/**
 * Web Vitals Integration for Vercel Analytics
 * Tracks Core Web Vitals and sends them to Vercel Analytics
 *
 * This script uses the web-vitals library from CDN
 * Metrics tracked: LCP, FID, CLS, FCP, TTFB, INP
 */

(function() {
  'use strict';

  // Only run in production and if analytics is available
  if (!window.va || window.location.hostname === 'localhost') {
    console.log('Web Vitals tracking disabled (development mode)');
    return;
  }

  /**
   * Send metric to Vercel Analytics
   */
  function sendToAnalytics(metric) {
    try {
      // Send to Vercel Analytics
      window.va('event', {
        name: 'web-vital',
        data: {
          metric_name: metric.name,
          value: Math.round(metric.name === 'CLS' ? metric.value * 1000 : metric.value),
          rating: metric.rating,
          delta: Math.round(metric.name === 'CLS' ? metric.delta * 1000 : metric.delta),
          id: metric.id,
          page: window.location.pathname,
        },
      });

      // Log in development
      if (window.location.hostname === 'localhost') {
        console.log('[Web Vitals]', metric.name, metric.value, metric.rating);
      }
    } catch (error) {
      console.error('Failed to send web vital:', error);
    }
  }

  /**
   * Load and initialize web-vitals library
   */
  function initWebVitals() {
    // Load web-vitals from CDN
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/web-vitals@3/dist/web-vitals.iife.js';
    script.async = true;

    script.onload = function() {
      if (!window.webVitals) {
        console.error('Web Vitals library failed to load');
        return;
      }

      try {
        // Track Core Web Vitals
        window.webVitals.onCLS(sendToAnalytics);  // Cumulative Layout Shift
        window.webVitals.onFID(sendToAnalytics);  // First Input Delay (deprecated in favor of INP)
        window.webVitals.onLCP(sendToAnalytics);  // Largest Contentful Paint
        window.webVitals.onFCP(sendToAnalytics);  // First Contentful Paint
        window.webVitals.onTTFB(sendToAnalytics); // Time to First Byte

        // Track Interaction to Next Paint (new metric replacing FID)
        if (window.webVitals.onINP) {
          window.webVitals.onINP(sendToAnalytics);
        }

        console.log('Web Vitals tracking initialized');
      } catch (error) {
        console.error('Failed to initialize Web Vitals:', error);
      }
    };

    script.onerror = function() {
      console.error('Failed to load Web Vitals library');
    };

    document.head.appendChild(script);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWebVitals);
  } else {
    initWebVitals();
  }

  /**
   * Track custom performance metrics
   */
  function trackCustomMetrics() {
    if (!window.performance || !window.performance.timing) {
      return;
    }

    // Wait for page to fully load
    window.addEventListener('load', function() {
      setTimeout(function() {
        const perfData = window.performance.timing;
        const pageLoadTime = perfData.loadEventEnd - perfData.navigationStart;
        const connectTime = perfData.responseEnd - perfData.requestStart;
        const renderTime = perfData.domComplete - perfData.domLoading;

        // Send custom metrics
        if (pageLoadTime > 0) {
          window.va('event', {
            name: 'performance',
            data: {
              page_load_time: pageLoadTime,
              connect_time: connectTime,
              render_time: renderTime,
              page: window.location.pathname,
            },
          });
        }
      }, 0);
    });
  }

  trackCustomMetrics();
})();
