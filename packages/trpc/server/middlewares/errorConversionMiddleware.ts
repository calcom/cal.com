import { toTRPCError } from "../lib/toTRPCError";
import { middleware } from "../trpc";

/**
 * Middleware that catches errors thrown by other layers and converts them to TRPCError.
 */
export const errorConversionMiddleware = middleware(async ({ next }) => {
  try {
    return await next();
  } catch (e) {
    throw toTRPCError(e);
  }
});
