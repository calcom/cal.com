import type { FastifyInstance } from "fastify";

import { apiAdminUserRoutes } from "./admin-user.route";

export async function adminRoutes(fastify: FastifyInstance): Promise<void> {
  // Apply admin authentication to all admin routes
  // fastify.addHook("preHandler", AuthGuards.requireRole(UserRole.ADMIN));

  await fastify.register(apiAdminUserRoutes);
}
