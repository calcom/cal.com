import { filterReqHeaders } from "@/lib/filterReqHeaders";
import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import { Request } from "express";

import { ERROR_STATUS } from "@calcom/platform-constants";
import { TRPCError } from "@calcom/platform-libraries";
import { Response } from "@calcom/platform-types";

@Catch(TRPCError)
export class TRPCExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("TRPCExceptionFilter");

  catch(exception: TRPCError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let statusCode = 500;
    let errorMessage = exception.message;

    switch (exception.code) {
      case "UNAUTHORIZED":
        statusCode = 401;
        errorMessage = "You are not authorized to access this resource";
        break;
      case "FORBIDDEN":
        statusCode = 403;
        errorMessage = "You don't have necessary permissions to access this resource";
        break;
      case "NOT_FOUND":
        statusCode = 404;
        errorMessage = "The requested resource was not found";
        break;
      case "INTERNAL_SERVER_ERROR":
        statusCode = 500;
        errorMessage = "An unexpected error occurred on the server. Please try again later";
        break;
      case "BAD_REQUEST":
        statusCode = 400;
        errorMessage = "Bad request: Please check your request data and try again";
        break;
      case "CONFLICT":
        statusCode = 409;
        errorMessage = "Could not process the request due to a resource conflict with the current state";
        break;
      case "TOO_MANY_REQUESTS":
        statusCode = 429;
        errorMessage = "You have exceeded the allowed number of requests";
        break;
      case "PAYLOAD_TOO_LARGE":
        statusCode = 413;
        errorMessage = "The request payload is too large";
        break;
      case "CLIENT_CLOSED_REQUEST":
        statusCode = 499;
        errorMessage =
          "The client closed the connection before the server could finish processing the request";
        break;
      case "METHOD_NOT_SUPPORTED":
        statusCode = 405;
        errorMessage = "The requested method is not supported for this resource";
      case "NOT_IMPLEMENTED":
        statusCode = 501;
        errorMessage = "The requested method is not implemented on the server";
        break;
      case "PRECONDITION_FAILED":
        statusCode = 412;
        errorMessage =
          "The server does not meet one of the preconditions that the requester put on the request";
        break;
      case "TIMEOUT":
        statusCode = 408;
        errorMessage = "The request took too long to complete. Please try again later";
        break;
      case "UNPROCESSABLE_CONTENT":
        statusCode = 422;
        errorMessage =
          "The server was unable to process the request because the request payload is semantically incorrect or because the request is syntactically incorrect";
        break;
      case "PARSE_ERROR":
        statusCode = 400;
        errorMessage = "The request could not be parsed due to invalid syntax.";
        break;
      default:
        statusCode = 500;
        errorMessage = exception.message;
        break;
    }

    const requestId = request.headers["X-Request-Id"] ?? "unknown-request-id";
    response.setHeader("X-Request-Id", requestId.toString());

    this.logger.error(`TRPC Exception Filter: ${exception?.message}`, {
      exception,
      body: request.body,
      headers: filterReqHeaders(request.headers),
      url: request.url,
      method: request.method,
      requestId,
    });

    response.status(statusCode).json({
      status: ERROR_STATUS,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: { code: exception.name, message: errorMessage },
    });
  }
}
