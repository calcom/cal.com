import type { ApiResponse } from "@/types";
import type { FastifyReply } from "fastify";

export class ResponseFormatter {
  static success<T>(reply: FastifyReply, data?: T, message?: string, statusCode = 200, meta?: any): void {
    const response: ApiResponse<T> = {
      success: true,
      data,
      message,
      meta,
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
    const response: ApiResponse = {
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

    this.success(reply, data, message, 200, {
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  }
}
