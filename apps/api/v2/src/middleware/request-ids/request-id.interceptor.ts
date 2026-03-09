import { CallHandler, ExecutionContext, Injectable, Logger, NestInterceptor } from "@nestjs/common";
import { Request, Response } from "express";
import { tap } from "rxjs/operators";
import { extractIdFields } from "@/lib/extract-id-fields";
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

        let responseBody = "{}";

        try {
          if (data && typeof data === "object") {
            const dataObj = (data as Record<string, unknown>).data;
            if (dataObj && typeof dataObj === "object" && !Array.isArray(dataObj)) {
              responseBody = JSON.stringify(extractIdFields(dataObj as Record<string, unknown>));
            } else if (Array.isArray(dataObj)) {
              responseBody = JSON.stringify(
                dataObj.map((item) =>
                  item && typeof item === "object" ? extractIdFields(item as Record<string, unknown>) : item
                )
              );
            } else {
              responseBody = JSON.stringify(extractIdFields(data as Record<string, unknown>));
            }
          }
        } catch (err) {
          this.logger.error("Could not parse response body");
        }

        this.logger.log("Outgoing Response", {
          requestId,
          method,
          url,
          statusCode,
          responseTime,
          responseBody,
          timestamp: new Date().toISOString(),
          ...userContext,
        });
      })
    );
  }
}
