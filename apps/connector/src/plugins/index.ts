import type { FastifyInstance } from "fastify";

import authGuardsPlugin from "./authGuards";
// Import all plugins
import corsPlugin from "./cors";
import prismaPlugin from "./prisma";
import rateLimitPlugin from "./rateLimit";
import swaggerPlugin from "./swagger";
import multipartPlugin from "./multipart";

export async function registerPlugins(fastify: FastifyInstance): Promise<void> {
  console.log("🔌 Registering plugins...");

  // Register plugins in order - make sure each one completes before the next
  await fastify.register(corsPlugin);
  console.log("✅ CORS plugin registered");

  await fastify.register(prismaPlugin);
  console.log("✅ Prisma plugin registered");

  await fastify.register(authGuardsPlugin);
  console.log("✅ Auth guards plugin registered");

  await fastify.register(multipartPlugin);
  console.log("✅ Multipart plugin registered");

  await fastify.register(rateLimitPlugin);
  console.log("✅ Rate limit plugin registered");

  await fastify.register(swaggerPlugin);
  console.log("✅ Swagger plugin registered");

  console.log("✅ All plugins registered successfully");
}
