// Fixed swagger.ts with better error handling and debugging
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function swaggerPlugin(fastify: FastifyInstance): Promise<void> {
  const { NODE_ENV, PORT, HOST } = fastify.config;

  console.log("🔍 Swagger Debug Info:");
  console.log("NODE_ENV:", NODE_ENV);
  console.log("HOST:", HOST);
  console.log("PORT:", PORT);

  try {
    // Register Swagger with improved error handling
    await fastify.register(swagger, {
      openapi: {
        openapi: "3.0.0",
        info: {
          title: "Cal ID API",
          description: "This API provides comprehensive user management services for Cal ID.",
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
            url: NODE_ENV === "production" ? `https://api.${HOST}` : `http://${HOST}:${PORT}`,
            description: NODE_ENV === "production" ? "Production server" : "Development server",
          },
        ],
        components: {
          securitySchemes: {
            bearerAuth: {
              type: "http",
              scheme: "bearer",
              bearerFormat: "JWT | API Key",
              description: `
Use the Authorization header with Bearer scheme.  

Example:  
- JWT: \`Authorization: Bearer <jwt-token>\`  
- API Key (prefixed with "calid_"): \`Authorization: Bearer calid_xxxxx\`  

Server will differentiate automatically.
    `,
            },
          },

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
          { name: "Admin", description: "Admin endpoints (requires admin role)" },
          { name: "Users", description: "User management endpoints" },
          { name: "Event Types", description: "Event type management endpoints" },
          { name: "Teams", description: "Team management endpoints" },
          { name: "Team Event Types", description: "Event type management endpoints for teams" },
          { name: "Team Memberships", description: "Membership management endpoints for teams" },
          { name: "Team Schedules", description: "Schedule management endpoints for teams" },
        ],
      },
      hideUntagged: true,
      // Improved transform function with error handling
      transform: ({ schema, url }) => {
        try {
          // Add validation for schema structure
          // if (!schema) {
          //   console.warn(`⚠️ No schema found for route: ${url}`);
          //   return { schema: {}, url };
          // }

          // Log problematic schemas for debugging
          // if (schema.response) {
          //   Object.keys(schema.response).forEach((statusCode) => {
          //     const responseSchema = schema.response[statusCode];
          //     if (
          //       responseSchema &&
          //       typeof responseSchema === "object" &&
          //       !responseSchema.type &&
          //       !responseSchema.properties &&
          //       !responseSchema.$ref
          //     ) {
          //       console.warn(
          //         `⚠️ Potentially problematic response schema for ${url} (${statusCode}):`,
          //         responseSchema
          //       );
          //     }
          //   });
          // }

          return { schema, url };
        } catch (error) {
          console.error(`❌ Error transforming schema for ${url}:`, error);
          return { schema: {}, url };
        }
      },
    });

    console.log("✅ Swagger core registered successfully");

    // Register Swagger UI
    const shouldExposeSwaggerUI = NODE_ENV === "development" || process.env.EXPOSE_SWAGGER_UI === "true";
    console.log("shouldExposeSwaggerUI:", shouldExposeSwaggerUI);

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

      const baseUrl = NODE_ENV === "production" ? `https://api.${HOST}` : `http://${HOST}:${PORT}`;
      fastify.log.info(`📚 Swagger UI available at: ${baseUrl}/docs`);
      console.log(`📚 Swagger UI available at: ${baseUrl}/docs`);
    } else {
      console.log("❌ Swagger UI not exposed - check NODE_ENV or EXPOSE_SWAGGER_UI");
    }

    fastify.log.info("✅ Swagger plugin registered successfully");
    console.log("✅ Swagger plugin registered successfully");
  } catch (error) {
    console.error("❌ Error in swagger plugin:", error);
    throw error;
  }
}

export default fp(swaggerPlugin, {
  name: "swagger",
});

// Alternative minimal swagger configuration for debugging
export const minimalSwaggerPlugin = fp(
  async function minimalSwagger(fastify: FastifyInstance) {
    const { NODE_ENV, PORT, HOST } = fastify.config;

    await fastify.register(swagger, {
      openapi: {
        openapi: "3.0.0",
        info: {
          title: "Cal ID API",
          version: "1.0.0",
        },
        servers: [
          {
            url: `http://${HOST}:${PORT}`,
            description: "Development server",
          },
        ],
      },
    });

    if (NODE_ENV === "development") {
      await fastify.register(swaggerUi, {
        routePrefix: "/docs",
      });
    }
  },
  {
    name: "minimal-swagger",
  }
);
