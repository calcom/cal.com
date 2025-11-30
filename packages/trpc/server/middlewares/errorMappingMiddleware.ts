import { toTRPCError } from "../lib/toTRPCError";
import { middleware } from "../trpc";

/**
 * Middleware that catches errors thrown by feature layer code and converts them to TRPCError.
 * This allows feature code to throw ErrorWithCode instead of TRPCError, maintaining
 * transport-agnostic error handling in the feature layer.
 *
 * Apply this middleware to procedures that call feature layer code which may throw ErrorWithCode.
 */
export const errorMappingMiddleware = middleware(async ({ next }) => {
  try {
    return await next();
  } catch (e) {
    throw toTRPCError(e);
  }
});
