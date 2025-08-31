import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function swaggerPlugin(fastify: FastifyInstance): Promise<void> {
  const { NODE_ENV, PORT, HOST } = fastify.config;

  // Register Swagger
  await fastify.register(swagger, {
    openapi: {
      openapi: "3.0.0",
      info: {
        title: "Cal ID API",
        description: "API documentation for Cal ID",
        version: "1.0.0",
        contact: {
          name: "API Support",
          email: "support@onehash.com",
        },
        license: {
          name: "MIT",
          url: "https://opensource.org/licenses/MIT",
        },
      },
      servers: [
        {
          url: NODE_ENV === "production" ? "https://api.yourproject.com" : `http://${HOST}:${PORT}`,
          description: NODE_ENV === "production" ? "Production server" : "Development server",
        },
      ],
      components: {
        securitySchemes: {
          bearerAuth: {
            type: "http",
            scheme: "bearer",
            bearerFormat: "JWT",
            description: "Enter JWT token in the format: Bearer <token>",
          },
        },
        schemas: {
          Error: {
            type: "object",
            properties: {
              success: { type: "boolean", example: false },
              message: { type: "string" },
              error: {
                type: "object",
                properties: {
                  code: { type: "string" },
                  message: { type: "string" },
                  details: { type: "object" },
                },
              },
            },
          },
          SuccessResponse: {
            type: "object",
            properties: {
              success: { type: "boolean", example: true },
              data: { type: "object" },
              message: { type: "string" },
              meta: { type: "object" },
            },
          },
          PaginationMeta: {
            type: "object",
            properties: {
              pagination: {
                type: "object",
                properties: {
                  page: { type: "number" },
                  limit: { type: "number" },
                  total: { type: "number" },
                  totalPages: { type: "number" },
                },
              },
            },
          },
          User: {
            type: "object",
            properties: {
              id: { type: "string", format: "uuid" },
              email: { type: "string", format: "email" },
              name: { type: "string", nullable: true },
              role: { type: "string", enum: ["USER", "ADMIN", "MODERATOR"] },
              emailVerified: { type: "string", format: "date-time", nullable: true },
              image: { type: "string", nullable: true },
              createdAt: { type: "string", format: "date-time" },
              updatedAt: { type: "string", format: "date-time" },
            },
          },
        },
      },
      tags: [
        { name: "Health", description: "Health check endpoints" },
        { name: "Users", description: "User management endpoints" },
        { name: "Auth", description: "Authentication endpoints" },
      ],
    },
    hideUntagged: true,
  });

  // Register Swagger UI (only in development)
  if (NODE_ENV === "development") {
    await fastify.register(swaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: false,
        defaultModelsExpandDepth: 1,
        defaultModelExpandDepth: 1,
      },
      staticCSP: true,
      transformSpecificationClone: true,
    });

    fastify.log.info(`Swagger UI available at http://${HOST}:${PORT}/docs`);
  }

  fastify.log.info("Swagger plugin registered successfully");
}

export default fp(swaggerPlugin, {
  name: "swagger",
});
