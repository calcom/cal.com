import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { tap } from "rxjs/operators";

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  private readonly logger = new Logger("ResponseInterceptor - NestInterceptor");

  intercept(context: ExecutionContext, next: CallHandler) {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = request.headers["X-Request-Id"] ?? "unknown-request-id";
    response.setHeader("X-Request-Id", requestId.toString());
    const { method, url } = request;
    const startTime = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const { statusCode } = response;
        const responseTime = Date.now() - startTime;

        this.logger.log("Outgoing Response", {
          requestId,
          method,
          url,
          statusCode,
          responseTime,
          responseBody: data,
          timestamp: new Date().toISOString(),
        });
      })
    );
  }
}
