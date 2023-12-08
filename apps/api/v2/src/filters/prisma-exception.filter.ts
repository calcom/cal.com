import { Response } from "@/types/api";
import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpStatus, Logger } from "@nestjs/common";
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";

import { ERROR_STATUS, INTERNAL_SERVER_ERROR } from "@calcom/platform-constants";

type PrismaError =
  | PrismaClientInitializationError
  | PrismaClientKnownRequestError
  | PrismaClientRustPanicError
  | PrismaClientUnknownRequestError
  | PrismaClientValidationError;

@Catch(
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError
)
export class PrismaExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger("PrismaExceptionFilter");

  catch(error: PrismaError, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();

    this.logger.error(`PrismaError: ${error.message}`, {
      error,
    });
    response.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
      status: ERROR_STATUS,
      timestamp: new Date().toISOString(),
      error: { code: INTERNAL_SERVER_ERROR, message: "There was an error, please try again later." },
    });
  }
}
