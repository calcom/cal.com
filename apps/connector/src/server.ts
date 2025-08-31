import { createApp } from "./app";

let fastify: Awaited<ReturnType<typeof createApp>> | undefined;

async function start() {
  try {
    console.log("🏗️ Initializing server...");
    fastify = await createApp();

    const { PORT, HOST, NODE_ENV } = fastify.config;
    if (!PORT || !HOST) {
      throw new Error("Missing required config: PORT or HOST");
    }

    const address = await fastify.listen({
      port: parseInt(PORT, 10),
      host: HOST,
    });

    fastify.log.info(`🚀 Server running at ${address}`);
    fastify.log.info(`🌍 Environment: ${NODE_ENV}`);

    if (NODE_ENV === "development") {
      fastify.log.info(`📚 API Docs: ${address}/docs`);
      fastify.log.info(`🔍 Health Check: ${address}/api/health`);
    }
  } catch (error) {
    console.error("❌ Server startup failed:", error);

    if (fastify) {
      try {
        await fastify.close();
      } catch (closeError) {
        console.error("❌ Error closing Fastify instance:", closeError);
      }
    }
    process.exit(1);
  }
}

const gracefulShutdown = async (signal: string) => {
  console.log(`\n⚠️  Received ${signal}, shutting down...`);
  if (fastify) {
    try {
      await fastify.close();
      console.log("👋 Fastify instance closed.");
    } catch (error) {
      console.error("❌ Error closing Fastify instance:", error);
    }
  }
  process.exit(0);
};

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("unhandledRejection", (reason, promise) => {
  console.error("❌ Unhandled Rejection:", promise, "reason:", reason);
  process.exit(1);
});
process.on("uncaughtException", (error) => {
  console.error("❌ Uncaught Exception:", error);
  process.exit(1);
});

console.log("🎬 Starting server...");
start().catch((error) => {
  console.error("❌ Failed to start server:", error);
  process.exit(1);
});
