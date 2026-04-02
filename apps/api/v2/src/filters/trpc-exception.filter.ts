import { ERROR_STATUS } from "@calcom/platform-constants";
import { TRPCError } from "@calcom/platform-libraries";
import { Response } from "@calcom/platform-types";
import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import { Request } from "express";
import { extractUserContext } from "@/lib/extract-user-context";
import { filterReqHeaders } from "@/lib/filterReqHeaders";

export type TRPCErrorCode = TRPCError["code"];

export interface ErrorDefinition {
  statusCode: number;
  message: string;
}

// Define the specific TRPC error codes
export const TRPC_ERROR_CODE = {
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  NOT_FOUND: "NOT_FOUND",
  INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
  BAD_REQUEST: "BAD_REQUEST",
  CONFLICT: "CONFLICT",
  TOO_MANY_REQUESTS: "TOO_MANY_REQUESTS",
  PAYLOAD_TOO_LARGE: "PAYLOAD_TOO_LARGE",
  CLIENT_CLOSED_REQUEST: "CLIENT_CLOSED_REQUEST",
  METHOD_NOT_SUPPORTED: "METHOD_NOT_SUPPORTED",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
  PRECONDITION_FAILED: "PRECONDITION_FAILED",
  TIMEOUT: "TIMEOUT",
  UNPROCESSABLE_CONTENT: "UNPROCESSABLE_CONTENT",
  PARSE_ERROR: "PARSE_ERROR",
} as const; // `as const` ensures literal types, improving type inference

// Map TRPC error codes to their HTTP status codes and default messages
export const TRPC_ERROR_MAP: Record<(typeof TRPC_ERROR_CODE)[keyof typeof TRPC_ERROR_CODE], ErrorDefinition> =
  {
    [TRPC_ERROR_CODE.UNAUTHORIZED]: {
      statusCode: 401,
      message: "You are not authorized to access this resource",
    },
    [TRPC_ERROR_CODE.FORBIDDEN]: {
      statusCode: 403,
      message: "You don't have necessary permissions to access this resource",
    },
    [TRPC_ERROR_CODE.NOT_FOUND]: {
      statusCode: 404,
      message: "The requested resource was not found",
    },
    [TRPC_ERROR_CODE.INTERNAL_SERVER_ERROR]: {
      statusCode: 500,
      message: "An unexpected error occurred on the server. Please try again later",
    },
    [TRPC_ERROR_CODE.BAD_REQUEST]: {
      statusCode: 400,
      message: "Bad request: Please check your request data and try again",
    },
    [TRPC_ERROR_CODE.CONFLICT]: {
      statusCode: 409,
      message: "Could not process the request due to a resource conflict with the current state",
    },
    [TRPC_ERROR_CODE.TOO_MANY_REQUESTS]: {
      statusCode: 429,
      message: "You have exceeded the allowed number of requests",
    },
    [TRPC_ERROR_CODE.PAYLOAD_TOO_LARGE]: {
      statusCode: 413,
      message: "The request payload is too large",
    },
    [TRPC_ERROR_CODE.CLIENT_CLOSED_REQUEST]: {
      statusCode: 499,
      message: "The client closed the connection before the server could finish processing the request",
    },
    [TRPC_ERROR_CODE.METHOD_NOT_SUPPORTED]: {
      statusCode: 405,
      message: "The requested method is not supported for this resource",
    },
    [TRPC_ERROR_CODE.NOT_IMPLEMENTED]: {
      statusCode: 501,
      message: "The requested method is not implemented on the server",
    },
    [TRPC_ERROR_CODE.PRECONDITION_FAILED]: {
      statusCode: 412,
      message: "The server does not meet one of the preconditions that the requester put on the request",
    },
    [TRPC_ERROR_CODE.TIMEOUT]: {
      statusCode: 408,
      message: "The request took too long to complete. Please try again later",
    },
    [TRPC_ERROR_CODE.UNPROCESSABLE_CONTENT]: {
      statusCode: 422,
      message:
        "The server was unable to process the request because the request payload is semantically incorrect or because the request is syntactically incorrect",
    },
    [TRPC_ERROR_CODE.PARSE_ERROR]: {
      statusCode: 400,
      message: "The request could not be parsed due to invalid syntax.",
    },
  };

// --- TRPCExceptionFilter (updated) ---

@Catch(TRPCError)
export class TRPCExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("TRPCExceptionFilter");

  catch(exception: TRPCError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const errorDefinition = TRPC_ERROR_MAP[exception.code as keyof typeof TRPC_ERROR_CODE] || {
      statusCode: 500,
      message: exception.message,
    };

    const statusCode = errorDefinition.statusCode;
    const errorMessage = exception.message || errorDefinition.message;

    const requestId = request.headers["X-Request-Id"] ?? "unknown-request-id";
    response.setHeader("X-Request-Id", requestId.toString());

    const userContext = extractUserContext(request);
    this.logger.error(`TRPC Exception Filter: ${exception?.message}`, {
      exception,
      body: request.body,
      headers: filterReqHeaders(request.headers),
      url: request.url,
      method: request.method,
      requestId,
      ...userContext,
    });

    response.status(statusCode).json({
      status: ERROR_STATUS,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: { code: exception.name, message: errorMessage }, // exception.name is usually "TRPCError"
    });
  }
}
