/**
 * Telemetry abstraction for tracing operations
 * Allows injecting different implementations (Sentry, no-op, test mocks)
 */

export interface SpanOptions {
  name: string;
  op?: string;
}

export type SpanFn = <T>(options: SpanOptions, callback: () => T | Promise<T>) => Promise<T>;
