import { extractUserContext } from "@/lib/extract-user-context";
import { filterReqHeaders } from "@/lib/filterReqHeaders";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpStatus, Logger } from "@nestjs/common";
import { Request } from "express";
import { ZodError } from "zod";

import { BAD_REQUEST, ERROR_STATUS } from "@calcom/platform-constants";
import { Response } from "@calcom/platform-types";

@Catch(ZodError)
export class ZodExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("ZodExceptionFilter");

  catch(error: ZodError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.headers["X-Request-Id"] ?? "unknown-request-id";
    response.setHeader("X-Request-Id", requestId.toString());

    const userContext = extractUserContext(request);
    this.logger.error(`ZodError: ${error.message}`, {
      error,
      body: request.body,
      headers: filterReqHeaders(request.headers),
      url: request.url,
      method: request.method,
      requestId,
      ...userContext,
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
