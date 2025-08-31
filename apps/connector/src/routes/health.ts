import { ResponseFormatter } from "@/utils/response";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";

export async function healthRoutes(fastify: FastifyInstance): Promise<void> {
  // Basic health check
  fastify.get(
    "/health",
    {
      schema: {
        description: "Health check endpoint",
        tags: ["Health"],
        response: {
          200: {
            description: "Successful response",
            type: "object",
            properties: {
              success: { type: "boolean" },
              message: { type: "string" },
              data: {
                type: "object",
                properties: {
                  status: { type: "string" },
                  timestamp: { type: "string", format: "date-time" },
                  uptime: { type: "number" },
                  environment: { type: "string" },
                  version: { type: "string" },
                },
              },
            },
          },
        },
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      const healthData = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        environment: process.env.NODE_ENV || "development",
      };

      ResponseFormatter.success(reply, healthData, "API is healthy");
    }
  );
}
