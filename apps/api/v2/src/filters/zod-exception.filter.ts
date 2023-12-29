import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpStatus, Logger } from "@nestjs/common";
import { ZodError } from "zod";

import { BAD_REQUEST, ERROR_STATUS } from "@calcom/platform-constants";
import { Response } from "@calcom/platform-types";

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ZodExceptionFilter");

  catch(error: ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    this.logger.error(`ZodError: ${error.message}`, {
      error,
    });
    response.status(HttpStatus.BAD_REQUEST).json({
      status: ERROR_STATUS,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: {
        code: BAD_REQUEST,
        message: error.issues.reduce(
          (acc, issue) => `${issue.path.join(".")} - ${issue.message}, ${acc}`,
          ""
        ),
      },
    });
  }
}
