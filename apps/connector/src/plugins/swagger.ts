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
        description: `
# Cal ID API Documentation

This API provides comprehensive user management and authentication services.

## Authentication
Include JWT token in Authorization header: \`Bearer <token>\`
Or use API key in X-API-Key header: \`<api-key>\`

## Rate Limiting
- Auth endpoints: 5 req/min
- User endpoints: 100 req/min  
- General endpoints: 1000 req/hour
        `,
        version: "1.0.0",
        contact: {
          name: "API Support",
          email: "support@onehash.com",
          url: "https://support.onehash.com",
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
            description: "JWT authorization header using the Bearer scheme",
          },
          apiKey: {
            type: "apiKey",
            name: "X-API-Key",
            in: "header",
            description: "API key for server-to-server authentication",
          },
        },
        // Only define common response patterns that aren't auto-generated
        responses: {
          BadRequest: {
            description: "Bad Request - Invalid parameters",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Invalid parameters" },
                  },
                },
              },
            },
          },
          Unauthorized: {
            description: "Unauthorized - Invalid credentials",
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  properties: {
                    success: { type: "boolean", example: false },
                    message: { type: "string", example: "Unauthorized" },
                  },
                },
              },
            },
          },
        },
      },
      tags: [
        { name: "Health", description: "Health check endpoints" },
        { name: "Users", description: "User management endpoints" },
        { name: "Auth", description: "Authentication endpoints" },
        { name: "Admin", description: "Admin endpoints (requires admin role)" },
      ],
    },
    hideUntagged: true,
    // Let Zod schemas handle the heavy lifting
    transform: ({ schema, url }) => {
      // Optional: Transform auto-generated schemas if needed
      return { schema, url };
    },
  });

  // Register Swagger UI (enhanced but minimal)
  const shouldExposeSwaggerUI = NODE_ENV === "development" || process.env.EXPOSE_SWAGGER_UI === "true";

  if (shouldExposeSwaggerUI) {
    await fastify.register(swaggerUi, {
      routePrefix: "/docs",
      uiConfig: {
        docExpansion: "list",
        deepLinking: true,
        tryItOutEnabled: true,
        filter: true,
        syntaxHighlight: {
          activate: true,
          theme: "monokai",
        },
      },
      staticCSP: true,
      transformSpecificationClone: true,
    });

    // Convenience redirect
    fastify.get("/swagger", async (request, reply) => {
      return reply.redirect("/docs");
    });

    const baseUrl = NODE_ENV === "production" ? "https://api.yourproject.com" : `http://${HOST}:${PORT}`;
    fastify.log.info(`📚 Swagger UI: ${baseUrl}/docs`);
  }

  fastify.log.info("✅ Swagger plugin registered");
}

export default fp(swaggerPlugin, {
  name: "swagger",
});
