import type { RedisOptions } from "bullmq";
import IORedis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redisConnection: IORedis | undefined;
}

/**
 * Parse REDIS_URL into BullMQ-compatible RedisOptions.
 * Supports:
 *  redis://
 *  rediss:// (TLS)
 *  username/password/db
 */
function parseRedisUrl(url: string): RedisOptions {
  try {
    const parsed = new URL(url);

    const dbFromPath =
      parsed.pathname && parsed.pathname !== "/" ? Number(parsed.pathname.replace("/", "")) : 0;

    return {
      host: parsed.hostname,
      port: parsed.port ? Number(parsed.port) : 6379,
      username: parsed.username || undefined,
      password: parsed.password || undefined,
      db: Number.isNaN(dbFromPath) ? 0 : dbFromPath,

      // BullMQ requirement
      maxRetriesPerRequest: null,

      // Enable TLS for rediss://
      tls: parsed.protocol === "rediss:" ? {} : undefined,
    };
  } catch (error) {
    console.error("❌ Failed to parse REDIS_URL:", error);
    throw new Error("Invalid REDIS_URL format");
  }
}

/**
 * BullMQ connection options (for Queue / Worker / QueueEvents)
 */
export function getRedisOptions(): RedisOptions {
  const REDIS_URL = process.env.REDIS_URL ?? "redis://127.0.0.1:6379";
  return parseRedisUrl(REDIS_URL);
}

/**
 * Singleton Redis client (shared across app)
 * Prevents creating multiple connections during:
 *  - Next.js hot reload
 *  - Worker restarts
 *  - API route execution
 */
export function getRedisConnection(): IORedis {
  if (!global.__redisConnection) {
    console.log("🔌 Creating new Redis connection");

    const connection = new IORedis(getRedisOptions());

    connection.on("connect", () => console.log("✅ Redis connected"));

    connection.on("error", (err) => console.error("❌ Redis error:", err));

    connection.on("reconnecting", () => console.warn("🔄 Redis reconnecting..."));

    global.__redisConnection = connection;
  } else {
    console.log("♻️ Reusing existing Redis connection");
  }

  return global.__redisConnection;
}

/**
 * Graceful shutdown (important for workers + Docker)
 */
export async function closeRedisConnection() {
  if (global.__redisConnection) {
    console.log("🛑 Closing Redis connection...");
    await global.__redisConnection.quit();
    global.__redisConnection = undefined;
  }
}
