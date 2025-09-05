import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Request, Response } from "express";
import { tap } from "rxjs/operators";
import { extractUserContext } from "@/lib/extract-user-context";

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
    const userContext = extractUserContext(request);
    const startTime = Date.now();

    return next.handle().pipe(
      tap((data) => {
        const { statusCode } = response;
        const responseTime = Date.now() - startTime;

        let jsonBodyString = "{}";

        try {
          if (data && typeof data === "object") {
            jsonBodyString = JSON.stringify(data);
          }
        } catch (err) {
          this.logger.error("Could not parse request body");
        }

        this.logger.log("Outgoing Response", {
          requestId,
          method,
          url,
          statusCode,
          responseTime,
          responseBody: jsonBodyString,
          timestamp: new Date().toISOString(),
          ...userContext,
        });
      })
    );
  }
}
