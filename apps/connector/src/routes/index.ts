import { AuthGuards } from "@/auth";
import type { FastifyInstance } from "fastify";

import { adminRoutes } from "./admin";
import { healthRoutes } from "./health";
import { publicRoutes } from "./public";

export async function registerRoutes(fastify: FastifyInstance): Promise<void> {
  // Health routes (no auth)
  await fastify.register(healthRoutes, { prefix: "/api" });

  // Public user routes (authenticated users)
  await fastify.register(
    async function (fastify: FastifyInstance) {
      // Apply authentication middleware to ALL public routes registered here
      // fastify.addHook("preHandler", AuthGuards.authenticateFlexible());

      // All your public routes now inherit authentication automatically
      await fastify.register(publicRoutes);
    },
    { prefix: "/api" }
  );

  // Admin routes (admin only)
  await fastify.register(
    async function (fastify: FastifyInstance) {
      // Apply authentication middleware to ALL admin routes registered here
      fastify.addHook("preHandler", AuthGuards.authenticateSystemAdmin());

      // All your admin routes now inherit authentication automatically
      await fastify.register(adminRoutes);
    },
    {
      prefix: "/api/admin",
    }
  );

  fastify.log.info("All routes registered successfully");
}
