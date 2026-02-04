/**
 * Utility functions for handling TRPC-like errors without importing from @trpc/server.
 * This avoids circular dependencies in the lib package.
 */

const TRPC_ERROR_CODES_TO_HTTP: Record<string, number> = {
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
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
};

interface TRPCErrorLike {
  name: string;
  code: string;
  message: string;
}

export function isTRPCErrorLike(err: unknown): err is TRPCErrorLike {
  return (
    err !== null &&
    typeof err === "object" &&
    "name" in err &&
    err.name === "TRPCError" &&
    "code" in err &&
    typeof (err as TRPCErrorLike).code === "string" &&
    "message" in err &&
    typeof (err as TRPCErrorLike).message === "string"
  );
}

export function getHTTPStatusCodeFromTRPCErrorLike(err: TRPCErrorLike): number {
  return TRPC_ERROR_CODES_TO_HTTP[err.code] ?? 500;
}
