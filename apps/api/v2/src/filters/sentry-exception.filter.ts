import { ArgumentsHost, Catch, Logger, HttpStatus } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import * as Sentry from "@sentry/node";
import { Request } from "express";

import { ERROR_STATUS, INTERNAL_SERVER_ERROR } from "@calcom/platform-constants";
import { Response } from "@calcom/platform-types";

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  private readonly logger = new Logger("SentryExceptionFilter");

  handleUnknownError(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.headers["X-Request-Id"];

    this.logger.error(`Sentry Exception Filter: ${exception?.message}`, {
      exception,
      body: request.body,
      headers: request.headers,
      url: request.url,
      method: request.method,
      requestId,
    });

    // capture if client has been init
    if (Boolean(Sentry.getCurrentHub().getClient())) {
      Sentry.captureException(exception);
    }
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: ERROR_STATUS,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: { code: INTERNAL_SERVER_ERROR, message: "Internal server error." },
    });
  }
}
