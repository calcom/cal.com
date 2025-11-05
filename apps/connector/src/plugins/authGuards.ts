import { AuthGuards } from "@/auth/guards";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function authGuardsPlugin(fastify: FastifyInstance): Promise<void> {
  const { API_KEY_PREFIX, JWT_SECRET } = fastify.config;

  // // Register traditional JWT for session-based auth
  // await fastify.register(jwt, {
  //   secret: JWT_SECRET,
  //   sign: {
  //     expiresIn: "24h",
  //   },
  //   verify: {
  //     extractToken: (request) => {
  //       // Extract token from Authorization header: "Bearer <token>"
  //       const authHeader = request.headers.authorization;
  //       if (authHeader && authHeader.startsWith("Bearer ")) {
  //         return authHeader.substring(7);
  //       }
  //       return undefined;
  //     },
  //   },
  // });

  // Initialize enhanced auth guards with Prisma and config
  AuthGuards.initialize(fastify.prisma, {
    apiKeyPrefix: API_KEY_PREFIX,
    jwt_secret: JWT_SECRET,
  });

  // Decorate fastify with auth methods
  fastify.decorate("authenticateApiKey", AuthGuards.authenticateApiKey);
  fastify.decorate("authenticateAccessToken", AuthGuards.authenticateAccessToken);
  fastify.decorate("authenticateBearer", AuthGuards.authenticateBearer);
  fastify.decorate("authenticateFlexible", AuthGuards.authenticateFlexible);

  fastify.log.info("JWT and Enhanced Auth plugins registered successfully");
}

export default fp(authGuardsPlugin, {
  name: "jwt",
  dependencies: ["prisma"],
});

// Extend Fastify types
declare module "fastify" {
  interface FastifyInstance {
    authenticateApiKey(): any;
    authenticateAccessToken(): any;
    authenticateBearer(allowedMethods?: string[]): any;
    authenticateFlexible(): any;
  }
}
