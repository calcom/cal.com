import type { RedisOptions } from "bullmq";
import IORedis from "ioredis";

const REDIS_URL = process.env.REDIS_URL ?? "redis://localhost:6379";

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

export const redisConnection: RedisOptions = parseRedisUrl(REDIS_URL);

let client: IORedis | null = null;

export function getRedisClient() {
  if (!client) {
    client = new IORedis(redisConnection);
  }
  return client;
}
