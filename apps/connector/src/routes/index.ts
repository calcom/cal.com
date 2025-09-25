// Add this debugging to your routes registration
import { AuthGuards } from "@/auth";
import type { FastifyInstance } from "fastify";

import { adminRoutes } from "./admin";
import { healthRoutes } from "./health";
import { publicRoutes } from "./public";

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  const { PATH_PREFIX } = fastify.config;

  // Health routes (no auth)
  await fastify.register(
    async function (fastify: FastifyInstance) {
      console.log("🔍 Registering health routes with rate limiting...");

      // Apply IP-based rate limiting to health routes
      try {
        const rateLimitHandler = fastify.rateLimitByIp();

        fastify.addHook("preHandler", rateLimitHandler);
        console.log("✅ Rate limit hook added to health routes");
      } catch (error) {
        console.error("❌ Error adding rate limit hook to health routes:", error);
        throw error;
      }

      await fastify.register(healthRoutes);
    },
    { prefix: PATH_PREFIX }
  );

  // Public routes (authenticated users)
  await fastify.register(
    async function (fastify: FastifyInstance) {
      console.log("🔍 Registering public routes with auth and rate limiting...");

      // Apply authentication middleware
      fastify.addHook("preHandler", AuthGuards.authenticateFlexible());

      // Apply API key-based rate limiting
      try {
        const rateLimitHandler = fastify.rateLimitByApiKey();

        fastify.addHook("preHandler", rateLimitHandler);
        console.log("✅ Rate limit hook added to public routes");
      } catch (error) {
        console.error("❌ Error adding rate limit hook to public routes:", error);
        throw error;
      }

      await fastify.register(publicRoutes);
    },
    { prefix: PATH_PREFIX }
  );

  // Admin routes (admin only)
  await fastify.register(
    async function (fastify: FastifyInstance) {
      console.log("🔍 Registering admin routes with auth and rate limiting...");

      // Apply authentication middleware
      fastify.addHook("preHandler", AuthGuards.authenticateSystemAdmin());

      // Apply higher rate limits for admin routes
      try {
        const rateLimitHandler = fastify.rateLimitByApiKey();

        fastify.addHook("preHandler", rateLimitHandler);
        console.log("✅ Rate limit hook added to admin routes");
      } catch (error) {
        console.error("❌ Error adding rate limit hook to admin routes:", error);
        throw error;
      }

      await fastify.register(adminRoutes);
    },
    {
      prefix: `${PATH_PREFIX}/admin`,
    }
  );

  fastify.log.info("All routes registered successfully");
}
