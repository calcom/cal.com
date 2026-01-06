/**
 * Telemetry abstraction for tracing calendar subscription operations
 * Allows injecting different implementations (Sentry, no-op, test mocks)
 */

export interface SpanOptions {
  name: string;
  op?: string;
}

export type SpanFn = <T>(options: SpanOptions, callback: () => T | Promise<T>) => Promise<T>;

/**
 * Metrics for calendar cache performance tracking
 */
export interface CalendarCacheMetrics {
  /** Whether the cache was used for this request */
  cacheUsed: boolean;
  /** Number of calendars fetched from cache */
  cachedCalendarCount: number;
  /** Number of calendars fetched from original source */
  originalCalendarCount: number;
  /** Duration in milliseconds for cache fetch */
  cacheFetchDurationMs?: number;
  /** Duration in milliseconds for original calendar fetch */
  originalFetchDurationMs?: number;
  /** Total duration in milliseconds */
  totalDurationMs: number;
}

/**
 * Metrics for webhook call tracking
 */
export interface WebhookMetrics {
  /** The calendar provider (google_calendar, office365_calendar) */
  provider: string;
  /** Whether the webhook was processed successfully */
  success: boolean;
  /** Duration in milliseconds for webhook processing */
  durationMs: number;
  /** Error message if the webhook failed */
  errorMessage?: string;
}
