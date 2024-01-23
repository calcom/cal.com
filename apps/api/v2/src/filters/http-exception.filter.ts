import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from "@nestjs/common";

import { ERROR_STATUS } from "@calcom/platform-constants";
import { Response } from "@calcom/platform-types";

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter<HttpException> {
  private readonly logger = new Logger("HttpExceptionFilter");

  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest();
    const statusCode = exception.getStatus();
    this.logger.error(`Http Exception Filter: ${exception?.message}`, {
      exception,
    });
    response.status(statusCode).json({
      status: ERROR_STATUS,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: { code: exception.name, message: exception.message },
    });
  }
}
