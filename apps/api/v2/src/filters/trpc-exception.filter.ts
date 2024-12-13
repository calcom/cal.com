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
    switch (exception.code) {
      case "UNAUTHORIZED":
        statusCode = 401;
        break;
      case "FORBIDDEN":
        statusCode = 403;
        break;
      case "NOT_FOUND":
        statusCode = 404;
        break;
      case "INTERNAL_SERVER_ERROR":
        statusCode = 500;
        break;
      case "BAD_REQUEST":
        statusCode = 400;
        break;
      case "CONFLICT":
        statusCode = 409;
        break;
      case "TOO_MANY_REQUESTS":
        statusCode = 429;
      default:
        statusCode = 500;
        break;
    }

    const requestId = request.headers["X-Request-Id"];

    this.logger.error(`TRPC Exception Filter: ${exception?.message}`, {
      exception,
      body: request.body,
      headers: request.headers,
      url: request.url,
      method: request.method,
      requestId,
    });

    response.status(statusCode).json({
      status: ERROR_STATUS,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: { code: exception.name, message: exception.message },
    });
  }
}
