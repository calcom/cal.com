import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, Logger } from "@nestjs/common";
import type { Request, Response } from "express";
import { extractUserContext } from "@/lib/extract-user-context";
import { filterReqHeaders } from "@/lib/filterReqHeaders";
import { OAuth2HttpException } from "@/modules/auth/oauth2/filters/oauth2-http.exception";

@Catch(OAuth2HttpException)
export class OAuth2HttpExceptionFilter implements ExceptionFilter<OAuth2HttpException> {
  private readonly logger = new Logger("OAuth2HttpExceptionFilter");

  catch(exception: OAuth2HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const requestId = request.headers["x-request-id"] ?? "unknown-request-id";
    response.setHeader("X-Request-Id", requestId.toString());

    const { userEmail: _userEmail, ...safeUserContext } = extractUserContext(request);
    const { Authorization: _auth, ...safeHeaders } = filterReqHeaders(request.headers);
    this.logger.error(`OAuth2 Http Exception: ${exception.oAuthErrorData.error}`, {
      exception,
      body: "[REDACTED]",
      headers: safeHeaders,
      url: request.url,
      method: request.method,
      requestId,
      ...safeUserContext,
    });

    response.status(exception.getStatus()).json(exception.oAuthErrorData);
  }
}
