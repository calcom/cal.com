import cors from "@fastify/cors";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function corsPlugin(fastify: FastifyInstance): Promise<void> {
  const { CORS_ORIGIN, NODE_ENV } = fastify.config;

  await fastify.register(cors, {
    origin:
      NODE_ENV === "production"
        ? [CORS_ORIGIN] // Restrict to specific origins in production
        : true, // Allow all origins in development
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Origin",
      "X-Requested-With",
      "Content-Type",
      "Accept",
      "Authorization",
      "Cache-Control",
      "X-Request-ID",
    ],
  });

  fastify.log.info(`CORS plugin registered with origin: ${CORS_ORIGIN}`);
}

export default fp(corsPlugin, {
  name: "cors",
});
