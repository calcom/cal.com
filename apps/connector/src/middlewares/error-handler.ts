import { AppError } from "@/utils/error";
import { ResponseFormatter } from "@/utils/response";
import type { FastifyInstance, FastifyError, FastifyRequest, FastifyReply } from "fastify";
import { ZodError } from "zod";

export async function errorHandler(fastify: FastifyInstance): Promise<void> {
  fastify.setErrorHandler(async (error: FastifyError, request: FastifyRequest, reply: FastifyReply) => {
    // Log error
    request.log.error(
      {
        error: {
          message: error.message,
          stack: error.stack,
          statusCode: error.statusCode,
        },
        req: {
          method: request.method,
          url: request.url,
          headers: request.headers,
        },
      },
      "Request error"
    );

    // Handle different error types
    if (error instanceof AppError) {
      return ResponseFormatter.error(reply, error.message, error.statusCode, error.code, error.details);
    }

    if (error instanceof ZodError) {
      const errorMessage = error.errors.map((err) => `${err.path.join(".")}: ${err.message}`).join(", ");

      return ResponseFormatter.error(reply, `Validation failed: ${errorMessage}`, 400, "VALIDATION_ERROR", {
        errors: error.errors,
      });
    }

    // Fastify validation errors
    if (error.statusCode === 400 && error.code === "FST_ERR_VALIDATION") {
      return ResponseFormatter.error(reply, error.message, 400, "VALIDATION_ERROR");
    }

    // JWT errors
    if (error.code === "FST_JWT_NO_AUTHORIZATION_IN_HEADER") {
      return ResponseFormatter.error(reply, "Authorization header is required", 401, "UNAUTHORIZED");
    }

    if (error.code === "FST_JWT_AUTHORIZATION_TOKEN_INVALID") {
      return ResponseFormatter.error(reply, "Invalid or expired token", 401, "UNAUTHORIZED");
    }

    // Rate limit errors
    if (error.statusCode === 429) {
      return ResponseFormatter.error(reply, "Too many requests", 429, "RATE_LIMIT_EXCEEDED");
    }

    // Default error response
    const isDevelopment = process.env.NODE_ENV === "development";

    return ResponseFormatter.error(
      reply,
      isDevelopment ? error.message : "Internal server error",
      error.statusCode || 500,
      "INTERNAL_ERROR",
      isDevelopment ? { stack: error.stack } : undefined
    );
  });
}
