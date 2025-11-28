import { extractUserContext } from "@/lib/extract-user-context";
import { filterReqHeaders } from "@/lib/filterReqHeaders";
import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import type { Request, Response } from "express";

import { getHttpStatusForErrorCode } from "@calcom/lib/errorCodes";
import { ErrorWithCode } from "@calcom/lib/errors";
import { ERROR_STATUS } from "@calcom/platform-constants";

@Catch(ErrorWithCode)
export class ErrorWithCodeExceptionFilter implements ExceptionFilter<ErrorWithCode> {
  private readonly logger = new Logger("ErrorWithCodeExceptionFilter");

  catch(exception: ErrorWithCode, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const statusCode = getHttpStatusForErrorCode(exception.code);
    const requestId = request.headers["X-Request-Id"] ?? "unknown-request-id";
    response.setHeader("X-Request-Id", requestId.toString());
    const userContext = extractUserContext(request);
    this.logger.error(`ErrorWithCode Exception Filter: ${exception?.message}`, {
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
      message: exception.message,
      error: { code: exception.code, message: exception.message },
    });
  }
}
