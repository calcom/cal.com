import { captureException, startSpan } from "@sentry/nextjs";

import { redactSensitiveData } from "./redactSensitiveData";

/*
WHEN TO USE
We ran a script that performs a simple mathematical calculation within a loop of 1000000 iterations.
Our results were: Plain execution time: 441, Monitored execution time: 8094.
This suggests that using these wrappers within large loops can incur significant overhead and is thus not recommended.

For smaller loops, the cost incurred may not be very significant on an absolute scale
considering that a million monitored iterations only took roughly 8 seconds when monitored.
*/

/**
 * @deprecated Use withReporting instead. This function will be removed in a future version.
 * Example: withReporting(myFunction, "myFunction")(...args)
 */
const monitorCallbackAsync = async <T extends (...args: any[]) => any>(
  cb: T,
  ...args: Parameters<T>
): Promise<ReturnType<T>> => {
  // Check if Sentry set
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN || !process.env.SENTRY_TRACES_SAMPLE_RATE) {
    return (await cb(...args)) as ReturnType<T>;
  }

  return await startSpan({ name: cb.name }, async () => {
    try {
      const result = await cb(...args);
      return result as ReturnType<T>;
    } catch (error) {
      captureException(error);
      throw error;
    }
  });
};

/**
 * @deprecated Use withReporting instead. This function will be removed in a future version.
 * Example: withReporting(myFunction, "myFunction")(...args)
 */
const monitorCallbackSync = <T extends (...args: any[]) => any>(
  cb: T,
  ...args: Parameters<T>
): ReturnType<T> => {
  // Check if Sentry set
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN || !process.env.SENTRY_TRACES_SAMPLE_RATE)
    return cb(...args) as ReturnType<T>;

  return startSpan({ name: cb.name }, () => {
    try {
      const result = cb(...args);
      return result as ReturnType<T>;
    } catch (error) {
      captureException(error);
      throw error;
    }
  });
};

/**
 * Type guard to check if a value is a Promise
 */
function isPromise<T>(value: unknown): value is Promise<T> {
  return value instanceof Promise;
}

/**
 * Creates an error handler that captures the error in Sentry with context
 */
function createErrorHandler(name: string, args: unknown[]) {
  return (error: unknown) => {
    const context = {
      functionName: name,
      args: redactSensitiveData(args),
    };

    if (error instanceof Error) {
      (error as any).context = context;
    }

    captureException(error, {
      extra: context,
      tags: { functionName: name },
    });

    throw error;
  };
}

/**
 * Recommended way to wrap functions for Sentry reporting.
 * Properly handles both sync and async functions with proper error context capture.
 *
 * @example
 * // Async function
 * const myAsyncFunction = withReporting(async (arg1: string, arg2: number) => {
 *   // async implementation
 * }, "myAsyncFunction");
 *
 * // Sync function
 * const mySyncFunction = withReporting((arg1: string, arg2: number) => {
 *   // sync implementation
 * }, "mySyncFunction");
 */
/**
 * Minimal interface for setting span attributes during execution.
 * Compatible with Sentry's Span interface.
 */
export interface TelemetrySpan {
  setAttribute(key: string, value: string | number | boolean): void;
}

/**
 * Options for creating a telemetry span.
 */
export interface TelemetrySpanOptions {
  /** Name of the span (required) */
  name: string;
  /** Operation type for categorization in Sentry (e.g., "calendar.cache.getAvailability") */
  op?: string;
  /** Initial attributes to set on the span */
  attributes?: Record<string, string | number | boolean>;
}

/**
 * No-op span implementation for when Sentry is not configured.
 */
const noOpSpan: TelemetrySpan = {
  setAttribute: () => {},
};

/**
 * Wraps an async function with a Sentry span for telemetry tracking.
 * Supports custom span attributes and operation types for better categorization in Sentry.
 *
 * @example
 * const result = await withSpan(
 *   {
 *     name: "CalendarCacheWrapper.getAvailability",
 *     op: "calendar.cache.getAvailability",
 *     attributes: { calendarCount: 5, cacheEnabled: true }
 *   },
 *   async (span) => {
 *     // Your async code here
 *     span.setAttribute("eventsCount", results.length);
 *     return results;
 *   }
 * );
 */
export async function withSpan<T>(
  options: TelemetrySpanOptions,
  callback: (span: TelemetrySpan) => Promise<T>
): Promise<T> {
  // Early return with no-op span if Sentry is not configured
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN || !process.env.SENTRY_TRACES_SAMPLE_RATE) {
    return callback(noOpSpan);
  }

  return startSpan(
    {
      name: options.name,
      op: options.op,
      attributes: options.attributes,
    },
    async (span) => {
      // Create a wrapper that implements TelemetrySpan interface
      const telemetrySpan: TelemetrySpan = {
        setAttribute: (key, value) => span.setAttribute(key, value),
      };
      return callback(telemetrySpan);
    }
  );
}

export function withReporting<T extends any[], R>(func: (...args: T) => R, name: string): (...args: T) => R {
  if (!name?.trim()) {
    throw new Error("withReporting requires a non-empty name parameter");
  }

  // Early return if Sentry is not configured
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN || !process.env.SENTRY_TRACES_SAMPLE_RATE) {
    return func;
  }

  return (...args: T): R => {
    return startSpan({ name }, () => {
      const onError = createErrorHandler(name, args);

      try {
        const result = func(...args);

        // Handle Promise case with proper type guard
        if (isPromise(result)) {
          return result.catch(onError) as R;
        }

        // Handle sync case
        return result;
      } catch (error) {
        onError(error);
        // This line is technically unreachable due to onError throwing,
        // but TypeScript needs it for type safety
        throw error;
      }
    });
  };
}

export default monitorCallbackAsync;
export { monitorCallbackSync };
