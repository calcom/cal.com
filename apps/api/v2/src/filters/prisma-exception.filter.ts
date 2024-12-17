import type { ArgumentsHost, ExceptionFilter } from "@nestjs/common";
import { Catch, HttpStatus, Logger } from "@nestjs/common";
import {
  PrismaClientInitializationError,
  PrismaClientKnownRequestError,
  PrismaClientRustPanicError,
  PrismaClientUnknownRequestError,
  PrismaClientValidationError,
} from "@prisma/client/runtime/library";
import { Request } from "express";

import {
  BAD_REQUEST,
  CONFLICT,
  ERROR_STATUS,
  INTERNAL_SERVER_ERROR,
  NOT_FOUND,
} from "@calcom/platform-constants";
import { Response } from "@calcom/platform-types";

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
    const request = ctx.getRequest<Request>();
    const requestId = request.headers["X-Request-Id"];

    this.logger.error(`PrismaError: ${error.message}`, {
      error,
      body: request.body,
      headers: request.headers,
      url: request.url,
      method: request.method,
      requestId,
    });

    let message = "There was an error, please try again later.";
    let statusCode = HttpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = INTERNAL_SERVER_ERROR;
    if (error instanceof PrismaClientKnownRequestError) {
      switch (error.code) {
        case "P2002": // Unique constraint failed
          errorCode = CONFLICT;
          statusCode = HttpStatus.CONFLICT;
          message = "Invalid Input: Trying to create a record that already exists.";
          break;
        case "P2025": // Record not found
          errorCode = NOT_FOUND;
          statusCode = HttpStatus.NOT_FOUND;
          message = "Invalid Query: The requested record was not found.";
          break;
        case "P2003": // Foreign key constraint failed
          errorCode = BAD_REQUEST;
          statusCode = HttpStatus.BAD_REQUEST;
          message = "Invalid input: The referenced data does not exist.";
          break;
        default:
          break;
      }
    }

    response.status(statusCode).json({
      status: ERROR_STATUS,
      timestamp: new Date().toISOString(),
      path: request.url,
      error: { code: errorCode, message: message },
    });
  }
}
