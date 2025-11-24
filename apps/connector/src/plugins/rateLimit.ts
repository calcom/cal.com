// plugins/ratelimit.ts
import { Ratelimit } from "@unkey/ratelimit";
import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import fp from "fastify-plugin";

interface RateLimitOptions {
  namespace?: string;
  limit?: number;
  duration?: string;
  async?: boolean;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
}

// Helper functions
function extractApiKeyIdentifier(request: FastifyRequest): string | null {
  // Try Authorization header first: "Bearer <api_key>"
  const authHeader = request.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.substring(7);
    return `apikey:${token}`;
  }

  // Try X-API-Key header
  const apiKeyHeader = request.headers["x-api-key"];
  if (apiKeyHeader && typeof apiKeyHeader === "string") {
    return `apikey:${apiKeyHeader}`;
  }

  // Try query parameter
  const query = request.query as Record<string, any>;
  if (query.api_key && typeof query.api_key === "string") {
    return `apikey:${query.api_key}`;
  }

  return null;
}

function extractIpAddress(request: FastifyRequest): string {
  // Check for forwarded IP first (common in production behind proxies)
  const forwarded = request.headers["x-forwarded-for"];
  if (forwarded && typeof forwarded === "string") {
    return `ip:${forwarded.split(",")[0].trim()}`;
  }

  // Check for real IP
  const realIp = request.headers["x-real-ip"];
  if (realIp && typeof realIp === "string") {
    return `ip:${realIp}`;
  }

  // Fallback to connection remote address
  return `ip:${request.socket.remoteAddress || "unknown"}`;
}

async function performRateLimit(
  ratelimit: Ratelimit,
  identifier: string,
  reply: FastifyReply,
  options: RateLimitOptions = {}
) {
  const result = await ratelimit.limit(identifier);

  if (!result.success) {
    const resetTime = new Date(Date.now() + (result.reset || 0));

    reply.headers({
      "X-RateLimit-Limit": result.limit?.toString() || "0",
      "X-RateLimit-Remaining": result.remaining?.toString() || "0",
      "X-RateLimit-Reset": resetTime.toISOString(),
      "Retry-After": Math.ceil((result.reset || 0) / 1000).toString(),
    });

    reply.status(429).send({
      error: "Rate limit exceeded",
      message: "Too many requests. Please try again later.",
      retryAfter: Math.ceil((result.reset || 0) / 1000),
    });
    return;
  }

  // Add rate limit headers to successful requests
  reply.headers({
    "X-RateLimit-Limit": result.limit?.toString() || "0",
    "X-RateLimit-Remaining": result.remaining?.toString() || "0",
  });
}

// Factory functions that access the ratelimit instance from fastify
function createRateLimitByApiKey(fastify: FastifyInstance) {
  return (options: RateLimitOptions = {}) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!fastify.ratelimitInstance) {
        request.log.error("Ratelimit instance not found on fastify");
        throw new Error("Rate limiting not properly initialized");
      }

      try {
        // Extract API key from Authorization header or query param
        const identifier = extractApiKeyIdentifier(request);
        //trim identifier to max length of 256 characters
        const trimmedIdentifier = identifier ? identifier.substring(0, 255) : null;

        if (!trimmedIdentifier) {
          // No API key found, skip rate limiting or use IP as fallback
          const fallbackIdentifier = extractIpAddress(request);
          return performRateLimit(fastify.ratelimitInstance, fallbackIdentifier, reply, options);
        }

        return performRateLimit(fastify.ratelimitInstance, trimmedIdentifier, reply, options);
      } catch (error) {
        request.log.error({ error }, "Rate limit check failed");
        // Fail open - allow request if rate limit check fails
        return;
      }
    };
  };
}

function createRateLimitByUserId(fastify: FastifyInstance) {
  return (options: RateLimitOptions = {}) => {
    return async (request: FastifyRequest & { user?: any }, reply: FastifyReply) => {
      if (!fastify.ratelimitInstance) {
        request.log.error("Ratelimit instance not found on fastify");
        throw new Error("Rate limiting not properly initialized");
      }

      try {
        const userId = request.user?.id;

        if (!userId) {
          // No user ID, fallback to IP
          const fallbackIdentifier = extractIpAddress(request);
          return performRateLimit(fastify.ratelimitInstance, fallbackIdentifier, reply, options);
        }

        const identifier = `user:${userId}`;
        return performRateLimit(fastify.ratelimitInstance, identifier, reply, options);
      } catch (error) {
        request.log.error({ error }, "Rate limit check failed");
        return;
      }
    };
  };
}

function createRateLimitByIp(fastify: FastifyInstance) {
  return (options: RateLimitOptions = {}) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!fastify.ratelimitInstance) {
        request.log.error("Ratelimit instance not found on fastify");
        throw new Error("Rate limiting not properly initialized");
      }

      try {
        const identifier = extractIpAddress(request);
        return performRateLimit(fastify.ratelimitInstance, identifier, reply, options);
      } catch (error) {
        request.log.error({ error }, "Rate limit check failed");
        return;
      }
    };
  };
}

function createRateLimitCustom(fastify: FastifyInstance) {
  return (
    identifierFn: (request: FastifyRequest) => string | Promise<string>,
    options: RateLimitOptions = {}
  ) => {
    return async (request: FastifyRequest, reply: FastifyReply) => {
      if (!fastify.ratelimitInstance) {
        request.log.error("Ratelimit instance not found on fastify");
        throw new Error("Rate limiting not properly initialized");
      }

      try {
        const identifier = await identifierFn(request);
        return performRateLimit(fastify.ratelimitInstance, identifier, reply, options);
      } catch (error) {
        request.log.error({ error }, "Rate limit check failed");
        return;
      }
    };
  };
}

async function rateLimitPlugin(fastify: FastifyInstance): Promise<void> {
  console.log("🔧 Initializing rate limit plugin...");

  const { UNKEY_ROOT_KEY, UNKEY_NAMESPACE } = fastify.config;

  console.log("Environment check:", {
    hasRootKey: !!UNKEY_ROOT_KEY,
    namespace: UNKEY_NAMESPACE || "calid_api",
  });

  if (!UNKEY_ROOT_KEY) {
    const errorMsg = "UNKEY_ROOT_KEY not found in config. Rate limiting cannot be enabled.";
    fastify.log.error(errorMsg);
    throw new Error(errorMsg);
  }

  if (!UNKEY_NAMESPACE) {
    fastify.log.warn("UNKEY_NAMESPACE not found in config. Using default namespace 'calid_api'.");
  }

  try {
    // Create and store the ratelimit instance directly in fastify
    const ratelimitInstance = new Ratelimit({
      rootKey: UNKEY_ROOT_KEY,
      namespace: UNKEY_NAMESPACE || "calid_api",
      limit: 100,
      duration: "1m",
    });

    // Store the instance in fastify
    fastify.decorate("ratelimitInstance", ratelimitInstance);

    // Decorate fastify with factory functions that have access to the instance
    fastify.decorate("rateLimitByApiKey", createRateLimitByApiKey(fastify));
    fastify.decorate("rateLimitByUserId", createRateLimitByUserId(fastify));
    fastify.decorate("rateLimitByIp", createRateLimitByIp(fastify));
    fastify.decorate("rateLimitCustom", createRateLimitCustom(fastify));

    fastify.log.info("Rate limit plugin registered successfully");
  } catch (error) {
    console.error("❌ Failed to register rate limit plugin:", error);
    fastify.log.error({ error }, "Failed to register rate limit plugin");
    throw error;
  }
}

export default fp(rateLimitPlugin, {
  name: "ratelimit",
  dependencies: [],
});

// Extend Fastify types
declare module "fastify" {
  interface FastifyInstance {
    ratelimitInstance: Ratelimit;
    rateLimitByApiKey: (options?: RateLimitOptions) => any;
    rateLimitByUserId: (options?: RateLimitOptions) => any;
    rateLimitByIp: (options?: RateLimitOptions) => any;
    rateLimitCustom: (
      identifierFn: (request: FastifyRequest) => string | Promise<string>,
      options?: RateLimitOptions
    ) => any;
  }
}
