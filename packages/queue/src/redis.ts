import type { RedisOptions } from "bullmq";
import IORedis from "ioredis";

declare global {
  // eslint-disable-next-line no-var
  var __redisConnection: IORedis | undefined;
}

function parseRedisUrl(url: string): RedisOptions {
  try {
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 6379,
      password: parsed.password || undefined,
      username: parsed.username || undefined,
      db: parsed.pathname ? parseInt(parsed.pathname.slice(1)) : 0,
      tls: parsed.protocol === "rediss:" ? {} : undefined,
      maxRetriesPerRequest: null,
    };
  } catch (error) {
    console.error("Failed to parse REDIS_URL:", error);
    throw new Error("Invalid REDIS_URL format");
  }
}

export function getRedisOptions(): RedisOptions {
  const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
  return parseRedisUrl(REDIS_URL);
}

export function getRedisConnection(): IORedis {
  if (!global.__redisConnection) {
    console.log("Creating new Redis connection ");
    global.__redisConnection = new IORedis(getRedisOptions());
    global.__redisConnection.on("error", (err) => {
      console.error("Redis connection error:", err);
    });
  }
  console.log("Reusing existing Redis connection");
  return global.__redisConnection;
}
