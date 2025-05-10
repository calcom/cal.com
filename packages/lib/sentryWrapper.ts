import { startSpan, captureException } from "@sentry/nextjs";

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
 * Type guard to check if a function returns a Promise
 */
function isAsyncFunction<T extends any[], U>(
  func: (...args: T) => U | Promise<U>
): func is (...args: T) => Promise<U> {
  return func.constructor.name === "AsyncFunction";
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
export function withReporting<T extends any[], U>(func: (...args: T) => U, name: string): (...args: T) => U;
export function withReporting<T extends any[], U>(
  func: (...args: T) => Promise<U>,
  name: string
): (...args: T) => Promise<U>;
export function withReporting<T extends any[], U>(
  func: (...args: T) => U | Promise<U>,
  name: string
): (...args: T) => U | Promise<U> {
  if (!name?.trim()) {
    throw new Error("withReporting requires a non-empty name parameter");
  }

  // Early return if Sentry is not configured
  if (!process.env.NEXT_PUBLIC_SENTRY_DSN || !process.env.SENTRY_TRACES_SAMPLE_RATE) {
    return func;
  }

  // Handle async functions
  if (isAsyncFunction(func)) {
    return async (...args: T): Promise<U> => {
      const span = startSpan({ name }, async () => {
        try {
          return await func(...args);
        } catch (error) {
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
        }
      });

      return span;
    };
  }

  // Handle sync functions
  return (...args: T): U => {
    const result = startSpan({ name }, () => {
      try {
        return func(...args);
      } catch (error) {
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
      }
    });

    // Since this is the sync handler, we know startSpan will return U directly
    // and not a Promise<U> because we're not using async/await
    return result as U;
  };
}

export default monitorCallbackAsync;
export { monitorCallbackSync };
