import { envSchema } from "@/config/env";
import { registerPlugins } from "@/plugins";
import { registerRoutes } from "@/routes";
// Import Prisma
import envPlugin from "@fastify/env";
// Import AuthGuards
import type { PrismaClient } from "@prisma/client";
import type { FastifyInstance } from "fastify";
import Fastify from "fastify";

// Extend FastifyInstance to include 'config' and 'prisma'
declare module "fastify" {
  interface FastifyInstance {
    config: Record<string, any>;
    prisma: PrismaClient;
  }
}

export async function createApp(): Promise<FastifyInstance> {
  console.log("🚀 Starting app creation...");

  try {
    console.log("📦 Creating Fastify instance...");
    const fastify = Fastify({
      logger: true, // Enable logging
    });
    console.log("✅ Fastify instance created successfully");

    console.log("🔧 Registering env plugin...");
    // Register env plugin
    await fastify.register(envPlugin, {
      schema: envSchema,
      dotenv: true, // loads from .env automatically
      confKey: "config", // fastify.config will hold your env
    });
    console.log("✅ Env plugin registered successfully");

    //Registering plugins: prisma, , swagger
    await registerPlugins(fastify);

    console.log("🛣️ Starting route registration...");
    await registerRoutes(fastify);
    console.log("✅ All routes registered successfully");

    console.log("🎉 App creation completed successfully");
    return fastify;
  } catch (error) {
    console.error("Full error object:", error);
    throw error;
  }
}
