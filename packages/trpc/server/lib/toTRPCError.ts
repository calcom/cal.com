import { TRPCError } from "@trpc/server";

import { getServerErrorFromUnknown } from "@calcom/lib/server/getServerErrorFromUnknown";

type TRPCErrorCode =
  | "BAD_REQUEST"
  | "UNAUTHORIZED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "INTERNAL_SERVER_ERROR";

function httpStatusToTrpcCode(status: number): TRPCErrorCode {
  switch (status) {
    case 400:
      return "BAD_REQUEST";
    case 401:
      return "UNAUTHORIZED";
    case 403:
      return "FORBIDDEN";
    case 404:
      return "NOT_FOUND";
    case 409:
      return "CONFLICT";
    default:
      return "INTERNAL_SERVER_ERROR";
  }
}

/**
 * Converts an unknown error to a TRPCError.
 * This function uses the existing getServerErrorFromUnknown to map ErrorWithCode
 * and other error types to proper HTTP status codes, then converts to TRPCError.
 *
 * Use this in tRPC handlers when catching errors from feature layer code that
 * throws ErrorWithCode instead of TRPCError.
 */
export function toTRPCError(cause: unknown): TRPCError {
  if (cause instanceof TRPCError) {
    return cause;
  }

  const httpErr = getServerErrorFromUnknown(cause);

  return new TRPCError({
    code: httpStatusToTrpcCode(httpErr.statusCode),
    message: httpErr.message,
    cause: cause instanceof Error ? cause : undefined,
  });
}
