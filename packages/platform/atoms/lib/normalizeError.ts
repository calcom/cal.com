import type { ApiErrorResponse } from "@calcom/platform-types";

/**
 * Normalizes various error types into a consistent Error instance with axios properties
 * Handles: plain Error, axios errors, and ApiErrorResponse objects
 */
export function normalizeBookingError(err: Error | ApiErrorResponse): Error {
  // If it's already an Error with all properties, return as-is
  if (err instanceof Error && "config" in err) {
    return err;
  }

  // Create proper Error instance with message
  let message = "An error occurred";
  if (err instanceof Error) {
    message = err.message;
  } else if ("message" in err) {
    message = err.message;
  }
  const error = new Error(message);

  // Preserve stack trace if available
  if (err instanceof Error && err.stack) {
    error.stack = err.stack;
  }

  // Attach axios properties if they exist (safely typed)
  if ("config" in err && err.config) {
    Object.defineProperty(error, "config", { value: err.config, enumerable: true });
  }
  if ("response" in err && err.response) {
    Object.defineProperty(error, "response", { value: err.response, enumerable: true });
  }
  if ("request" in err && err.request) {
    Object.defineProperty(error, "request", { value: err.request, enumerable: true });
  }

  // Include original error for debugging
  Object.defineProperty(error, "originalError", { value: err, enumerable: true });

  return error;
}
