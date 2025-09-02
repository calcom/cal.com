// apps/connector/src/utils/response.ts
import type { FastifyReply } from "fastify";
import { z } from "zod";

// Define the response types directly here to avoid circular dependency issues
interface BaseSuccessResponse<T> {
  success: true;
  data?: T;
  message?: string;
  meta?: any;
}

interface BaseErrorResponse {
  success: false;
  message: string;
  error: {
    code: string;
    message: string;
    details?: any;
  };
}

interface BasePaginatedResponse<T> {
  success: true;
  data: T[];
  message?: string;
  meta: {
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

export class ResponseFormatter {
  static success<T>(reply: FastifyReply, data?: T, message?: string, statusCode = 200, meta?: any): void {
    const response: BaseSuccessResponse<T> = {
      success: true,
      ...(data !== undefined && { data }),
      ...(message !== undefined && { message }),
      ...(meta !== undefined && { meta }),
    };

    reply.status(statusCode).send(response);
  }

  static error(
    reply: FastifyReply,
    message: string,
    statusCode = 500,
    code = "INTERNAL_ERROR",
    details?: any
  ): void {
    const response: BaseErrorResponse = {
      success: false,
      message,
      error: {
        code,
        message,
        details,
      },
    };

    reply.status(statusCode).send(response);
  }

  static created<T>(reply: FastifyReply, data: T, message?: string): void {
    this.success(reply, data, message || "Resource created successfully", 201);
  }

  static noContent(reply: FastifyReply): void {
    reply.status(204).send();
  }

  static paginated<T>(
    reply: FastifyReply,
    data: T[],
    page: number,
    limit: number,
    total: number,
    message?: string
  ): void {
    const totalPages = Math.ceil(total / limit);

    const response: BasePaginatedResponse<T> = {
      success: true,
      data,
      ...(message !== undefined && { message }),
      meta: {
        pagination: {
          page,
          limit,
          total,
          totalPages,
        },
      },
    };

    reply.status(200).send(response);
  }

  // Additional helper methods for common HTTP status codes
  static badRequest(reply: FastifyReply, message: string, details?: any): void {
    this.error(reply, message, 400, "BAD_REQUEST", details);
  }

  static unauthorized(reply: FastifyReply, message = "Unauthorized", details?: any): void {
    this.error(reply, message, 401, "UNAUTHORIZED", details);
  }

  static forbidden(reply: FastifyReply, message = "Forbidden", details?: any): void {
    this.error(reply, message, 403, "FORBIDDEN", details);
  }

  static notFound(reply: FastifyReply, message = "Resource not found", details?: any): void {
    this.error(reply, message, 404, "NOT_FOUND", details);
  }

  static conflict(reply: FastifyReply, message = "Conflict", details?: any): void {
    this.error(reply, message, 409, "CONFLICT", details);
  }

  static validationError(reply: FastifyReply, message = "Validation failed", details?: any): void {
    this.error(reply, message, 422, "VALIDATION_ERROR", details);
  }

  // Method to handle Zod validation errors
  static zodValidationError(reply: FastifyReply, zodError: z.ZodError, message = "Validation failed"): void {
    const details = zodError.errors.map((err) => ({
      path: err.path.join("."),
      message: err.message,
      code: err.code,
    }));

    this.error(reply, message, 422, "VALIDATION_ERROR", details);
  }

  // Method to safely validate and respond with Zod schema
  static safeResponse<TSchema extends z.ZodSchema>(
    reply: FastifyReply,
    schema: TSchema,
    data: unknown,
    successMessage?: string,
    statusCode = 200
  ): void {
    try {
      const validatedData = schema.parse(data);
      this.success(reply, validatedData, successMessage, statusCode);
    } catch (error) {
      if (error instanceof z.ZodError) {
        this.zodValidationError(reply, error);
      } else {
        this.error(reply, "Validation failed", 422, "VALIDATION_ERROR", error);
      }
    }
  }
}
