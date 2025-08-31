import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import { PrismaClient } from "@calcom/prisma/client";

// export interface PrismaPluginOptions {
//   // Add any configuration options here
// }

async function prismaPlugin(fastify: FastifyInstance): Promise<void> {
  const prisma = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });

  try {
    await prisma.$connect();
    fastify.log.info("Successfully connected to database");
  } catch (error) {
    fastify.log.error({ error }, "Failed to connect to database");
    throw error;
  }

  // Decorate fastify instance with prisma client
  fastify.decorate("prisma", prisma);

  // Graceful shutdown
  fastify.addHook("onClose", async (fastifyInstance) => {
    fastifyInstance.log.info("Disconnecting from database...");
    await fastifyInstance.prisma.$disconnect();
  });
}

export default fp(prismaPlugin, {
  name: "prisma",
});

// Extend Fastify types
declare module "fastify" {
  interface FastifyInstance {
    prisma: PrismaClient;
  }
}
