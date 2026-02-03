/**
 * Safe Logger Utility
 *
 * Provides secure logging functions that only output in development mode.
 * This prevents sensitive data from being exposed in production logs.
 *
 * Security: All error objects, stack traces, and potentially sensitive data
 * should be logged using these functions to ensure they are not exposed in production.
 */

/**
 * Safely log an error message only in development mode.
 * Use this instead of console.error when logging error objects that may contain sensitive data.
 *
 * @param message - The error message prefix
 * @param error - Optional error object (will only be logged in __DEV__ mode)
 */
export const safeLogError = (message: string, error?: unknown): void => {
  if (__DEV__) {
    if (error !== undefined) {
      console.error(message, error);
    } else {
      console.error(message);
    }
  }
};

/**
 * Safely log a warning message only in development mode.
 * Use this instead of console.warn when logging potentially sensitive data.
 *
 * @param message - The warning message prefix
 * @param data - Optional additional data (will only be logged in __DEV__ mode)
 */
export const safeLogWarn = (message: string, data?: unknown): void => {
  if (__DEV__) {
    if (data !== undefined) {
      console.warn(message, data);
    } else {
      console.warn(message);
    }
  }
};

/**
 * Safely log an info message only in development mode.
 * Use this instead of console.log when logging potentially sensitive data.
 *
 * @param message - The info message prefix
 * @param data - Optional additional data (will only be logged in __DEV__ mode)
 */
export const safeLogInfo = (message: string, data?: unknown): void => {
  if (__DEV__) {
    if (data !== undefined) {
      console.log(message, data);
    } else {
      console.log(message);
    }
  }
};

/**
 * Get a safe error message for displaying to users.
 * Returns a generic message instead of exposing raw error details.
 *
 * @param error - The error object
 * @param fallbackMessage - The generic message to show to users
 * @returns The fallback message (never exposes raw error details to users)
 */
export const getSafeErrorMessage = (_error: unknown, fallbackMessage: string): string => {
  return fallbackMessage;
};
