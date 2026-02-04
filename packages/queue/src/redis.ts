import type { RedisOptions } from "bullmq";
import IORedis from "ioredis";

export const redisConnection: RedisOptions = {
  host: process.env.REDIS_HOST ?? "localhost",
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
};

let client: IORedis | null = null;

export function getRedisClient() {
  if (!client) {
    client = new IORedis(redisConnection);
  }
  return client;
}
