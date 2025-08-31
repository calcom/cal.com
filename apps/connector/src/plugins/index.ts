import type { FastifyInstance } from "fastify";

import authGuardsPlugin from "./authGuards";
// Import all plugins
import corsPlugin from "./cors";
import prismaPlugin from "./prisma";
import swaggerPlugin from "./swagger";

export async function registerPlugins(fastify: FastifyInstance): Promise<void> {
  console.log("🔌 Registering plugins...");
  // Register plugins in order
  await fastify.register(corsPlugin);
  await fastify.register(prismaPlugin);
  await fastify.register(authGuardsPlugin);
  await fastify.register(swaggerPlugin);
  console.log("✅ All plugins registered successfully");
}
