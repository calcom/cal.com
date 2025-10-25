import { CallHandler, ExecutionContext, Injectable, NestInterceptor, Logger } from "@nestjs/common";
import { Request, Response } from "express";
import { Observable, tap, catchError } from "rxjs";
import { PrismaClient } from "@calcom/prisma/client";
import { ApiLogsAnalyticsService } from "../services/api-logs-analytics.service";

@Injectable()
export class ApiLoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("ApiLoggingInterceptor");
  private readonly prisma = new PrismaClient();
  private analyticsService: ApiLogsAnalyticsService;

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    const requestId = (request.headers["X-Request-Id"] as string) ?? "unknown";
    const startTime = Date.now();

    return next.handle().pipe(
      tap(async (data) => {
        await this.logApiCall(request, response, data, requestId, startTime, null);
      }),
      catchError(async (error) => {
        await this.logApiCall(request, response, null, requestId, startTime, error);
        throw error;
      })
    );
  }

  private async logApiCall(
    request: Request,
    response: Response,
    data: any,
    requestId: string,
    startTime: number,
    error: any
  ) {
    try {
      const responseTime = Date.now() - startTime;
      const { method, path, query, headers, body } = request;
      const statusCode = error ? error.status || 500 : response.statusCode;
      const isError = statusCode >= 400;

      const user = (request as any).user;
      const userId = user?.id;
      const organizationId = user?.organizationId;
      const oauthClientId = user?.oauthClientId;

      const sanitizedHeaders = this.sanitizeHeaders(headers);
      const sanitizedBody = this.sanitizeBody(body);
      const sanitizedResponse = this.sanitizeBody(data);

      setImmediate(async () => {
        try {
          const timestamp = new Date();
          await this.prisma.apiCallLog.create({
            data: {
              requestId,
              method,
              endpoint: path.split("?")[0],
              path,
              queryParams: query,
              requestHeaders: sanitizedHeaders,
              requestBody: sanitizedBody,
              statusCode,
              responseBody: sanitizedResponse,
              responseHeaders: this.sanitizeHeaders(response.getHeaders()),
              responseTime,
              userId,
              organizationId,
              oauthClientId,
              isError,
              errorMessage: error?.message,
              errorStack: error?.stack,
              errorCode: error?.code,
              timestamp,
              userAgent: headers["user-agent"],
              ipAddress: request.ip,
            },
          });

          // Send to analytics backend
          if (this.analyticsService) {
            await this.analyticsService.sendToAnalytics({
              timestamp,
              method,
              endpoint: path.split("?")[0],
              statusCode,
              responseTime,
              isError,
              userId,
              organizationId,
            });
          }
        } catch (err) {
          this.logger.error(`Failed to log API call: ${err.message}`);
        }
      });
    } catch (err) {
      this.logger.error(`Error in logApiCall: ${err.message}`);
    }
  }

  private sanitizeHeaders(headers: any): any {
    const sanitized = { ...headers };
    const sensitiveKeys = ["authorization", "cookie", "x-api-key", "api-key"];
    
    for (const key of sensitiveKeys) {
      if (sanitized[key]) {
        sanitized[key] = "[REDACTED]";
      }
    }
    
    return sanitized;
  }

  private sanitizeBody(body: any): any {
    if (!body) return null;
    
    const sanitized = JSON.parse(JSON.stringify(body));
    const sensitiveKeys = ["password", "token", "secret", "apiKey", "accessToken", "refreshToken"];
    
    const sanitizeObject = (obj: any) => {
      if (typeof obj !== "object" || obj === null) return;
      
      for (const key in obj) {
        if (sensitiveKeys.some((sk) => key.toLowerCase().includes(sk))) {
          obj[key] = "[REDACTED]";
        } else if (typeof obj[key] === "object") {
          sanitizeObject(obj[key]);
        }
      }
    };
    
    sanitizeObject(sanitized);
    return sanitized;
  }
}
