/**
 * TRPC Error utilities that don't require importing from @trpc/server.
 * This allows packages/lib to handle TRPC errors without creating circular dependencies.
 *
 * These utilities use duck typing to detect TRPC errors based on their structure
 * rather than using instanceof checks.
 */

/**
 * Known TRPC error codes and their corresponding HTTP status codes.
 * This mapping mirrors the one in @trpc/server/http but without the import.
 */
const TRPC_ERROR_CODE_TO_HTTP_STATUS: Record<string, number> = {
  PARSE_ERROR: 400,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  FORBIDDEN: 403,
  METHOD_NOT_SUPPORTED: 405,
  TIMEOUT: 408,
  CONFLICT: 409,
  PRECONDITION_FAILED: 412,
  PAYLOAD_TOO_LARGE: 413,
  UNPROCESSABLE_CONTENT: 422,
  TOO_MANY_REQUESTS: 429,
  CLIENT_CLOSED_REQUEST: 499,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
};

/**
 * Interface representing the shape of a TRPC error.
 * Used for duck typing without importing from @trpc/server.
 */
interface TRPCErrorLike {
  name: string;
  code: string;
  message: string;
}

/**
 * Checks if an error looks like a TRPC error based on its structure.
 * Uses duck typing to avoid importing from @trpc/server.
 */
export function isTRPCErrorLike(error: unknown): error is TRPCErrorLike {
  if (!(error instanceof Error)) {
    return false;
  }

  const errorWithCode = error as Error & { code?: unknown };

  return (
    errorWithCode.name === "TRPCError" &&
    typeof errorWithCode.code === "string" &&
    errorWithCode.code in TRPC_ERROR_CODE_TO_HTTP_STATUS
  );
}

/**
 * Gets the HTTP status code for a TRPC-like error.
 * Returns 500 if the error code is not recognized.
 */
export function getHTTPStatusCodeFromTRPCErrorLike(error: TRPCErrorLike): number {
  return TRPC_ERROR_CODE_TO_HTTP_STATUS[error.code] ?? 500;
}
