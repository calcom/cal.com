// Fixed swagger.ts with better error handling and debugging
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function swaggerPlugin(fastify: FastifyInstance): Promise<void> {
  const { NODE_ENV, PORT, HOST, DOMAIN } = fastify.config;

  try {
    // Determine the correct server URL
    const isLocal = DOMAIN.includes("localhost") || DOMAIN.includes("127.0.0.1");

    const getServerUrl = () => (isLocal ? `http://${DOMAIN}:${PORT}` : `https://api.${DOMAIN}`);

    const getDescription = () => {
      if (isLocal) return "Development server ";
      if (DOMAIN.includes("calid.in")) return "Staging server ";
      return "Production server ";
    };

    const serverUrl = getServerUrl();
    const apiDescription = getDescription();
    const tags = [
      { name: "Health", description: "Health check endpoints" },
      ...(isLocal ? [{ name: "Admin", description: "Admin endpoints (requires admin role)" }] : []),
      { name: "Users", description: "User management endpoints" },
      { name: "Event Types", description: "Event type management endpoints" },
      { name: "Teams", description: "Team management endpoints" },
      { name: "Team Event Types", description: "Event type management endpoints for teams" },
      { name: "Team Memberships", description: "Membership management endpoints for teams" },
      { name: "Team Schedules", description: "Schedule management endpoints for teams" },
      { name: "Availability", description: "User availability management endpoints" },
      { name: "Schedule", description: "User schedule management endpoints" },
      { name: "Slots", description: "Available slots retrieval endpoints" },
      { name: "Booking", description: "Event booking endpoints" },
    ];
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
            url: serverUrl,
            description: apiDescription,
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

Examples:
- JWT: Authorization: Bearer <jwt-token>
- API Key: Authorization: Bearer calid_xxxxx
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
        tags,
      },
      hideUntagged: true,
      // Improved transform function with error handling to filter Admin endpoints
      transform: ({ schema, url }) => {
        try {
          // Hide Admin endpoints when not in local environment
          if (!isLocal && schema?.tags?.includes("Admin")) {
            return { schema: {}, url: "" };
          }
          return { schema, url };
        } catch (error) {
          console.error(`❌ Error transforming schema for ${url}:`, error);
          return { schema: {}, url };
        }
      },
      // Add transformObject to filter routes
      transformObject: ({ swaggerObject }) => {
        if (!isLocal && swaggerObject.paths) {
          // Remove paths that have Admin tag
          Object.keys(swaggerObject.paths).forEach((path) => {
            Object.keys(swaggerObject.paths[path]).forEach((method) => {
              const operation = swaggerObject.paths[path][method];
              if (operation?.tags?.includes("Admin")) {
                delete swaggerObject.paths[path][method];
              }
            });
            // Remove the path entirely if all methods are deleted
            if (Object.keys(swaggerObject.paths[path]).length === 0) {
              delete swaggerObject.paths[path];
            }
          });
        }
        return swaggerObject;
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
          // Add request interceptor to handle CORS
          requestInterceptor: (request) => {
            console.log("Swagger UI request:", request.url);
            return request;
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

// // Alternative minimal swagger configuration for debugging
// export const minimalSwaggerPlugin = fp(
//   async function minimalSwagger(fastify: FastifyInstance) {
//     const { NODE_ENV, PORT, HOST } = fastify.config;

//     await fastify.register(swagger, {
//       openapi: {
//         openapi: "3.0.0",
//         info: {
//           title: "Cal ID API",
//           version: "1.0.0",
//         },
//         servers: [
//           {
//             url: NODE_ENV === "production" ? `http://${HOST}/api` : `https://${HOST}:${PORT}/api`,
//             description: "Development server",
//           },
//         ],
//       },
//     });

//     if (NODE_ENV === "development") {
//       await fastify.register(swaggerUi, {
//         routePrefix: "/docs",
//       });
//     }
//   },
//   {
//     name: "minimal-swagger",
//   }
// );
