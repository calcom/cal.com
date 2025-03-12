import { filterReqHeaders } from "@/lib/filterReqHeaders";
import { ArgumentsHost, Catch, ExceptionFilter, Logger } from "@nestjs/common";
import { Request } from "express";

import { ERROR_STATUS } from "@calcom/platform-constants";
import {
  CalendarAppError,
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialError,
  CalendarAppDelegationCredentialConfigurationError,
  CalendarAppDelegationCredentialClientIdNotAuthorizedError,
  CalendarAppDelegationCredentialNotSetupError,
} from "@calcom/platform-libraries/app-store";
import { Response } from "@calcom/platform-types";

type CalendarError =
  | CalendarAppError
  | CalendarAppDelegationCredentialInvalidGrantError
  | CalendarAppDelegationCredentialError
  | CalendarAppDelegationCredentialConfigurationError
  | CalendarAppDelegationCredentialNotSetupError
  | CalendarAppDelegationCredentialClientIdNotAuthorizedError;
@Catch(
  CalendarAppError,
  CalendarAppDelegationCredentialInvalidGrantError,
  CalendarAppDelegationCredentialError,
  CalendarAppDelegationCredentialConfigurationError,
  CalendarAppDelegationCredentialClientIdNotAuthorizedError,
  CalendarAppDelegationCredentialNotSetupError
)
export class CalendarServiceExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("CalendarServiceExceptionFilter");

  catch(exception: CalendarError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const requestId = request.headers["X-Request-Id"];

    this.logger.error(`Calendar Service Exception Filter: ${exception?.message}`, {
      exception,
      body: request.body,
      headers: filterReqHeaders(request.headers),
      url: request.url,
      method: request.method,
      requestId,
    });

    response.status(400).json({
      status: ERROR_STATUS,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: { code: exception.name, message: exception.message },
    });
  }
}
