import { Response } from "@/types/api";
import { ArgumentsHost, Catch, Logger, HttpStatus } from "@nestjs/common";
import { BaseExceptionFilter } from "@nestjs/core";
import * as Sentry from "@sentry/node";

@Catch()
export class SentryFilter extends BaseExceptionFilter {
  private readonly logger = new Logger("SentryExceptionFilter");

  handleUnknownError(exception: any, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    this.logger.error(`Sentry Exception Filter: ${exception?.message}`, {
      exception,
    });

    // capture if client has been init
    if (Boolean(Sentry.getCurrentHub().getClient())) {
      Sentry.captureException(exception);
    }
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: "error",
      error: { code: "INTERNAL_SERVER_ERROR", message: "internal server error." },
    });
  }
}
