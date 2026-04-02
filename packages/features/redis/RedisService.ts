import process from "node:process";
import { Redis } from "@upstash/redis";
import type { IRedisService } from "./IRedisService";

export class RedisService implements IRedisService {
  private redis: Redis;

  constructor() {
    // Ensure we throw an Error to mimick old behavior
    if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
      throw new Error("Attempted to initialize Upstash Redis client without url or token.");
    }
    this.redis = Redis.fromEnv({
      signal: () => AbortSignal.timeout(2000),
    });
  }

  async get<TData>(key: string): Promise<TData | null> {
    return this.redis.get(key);
  }

  async del(key: string): Promise<number> {
    return this.redis.del(key);
  }

  async set<TData>(key: string, value: TData, opts?: { ttl?: number }): Promise<"OK" | TData | null> {
    return this.redis.set(
      key,
      value,
      opts?.ttl
        ? {
            px: opts.ttl,
          }
        : undefined
    );
  }

  async expire(key: string, seconds: number): Promise<0 | 1> {
    // Implementation for setting expiration time for key in Redis
    return this.redis.expire(key, seconds);
  }

  async lrange<TResult = string>(key: string, start: number, end: number): Promise<TResult[]> {
    return this.redis.lrange(key, start, end);
  }

  async lpush<TData>(key: string, ...elements: TData[]): Promise<number> {
    return this.redis.lpush(key, elements);
  }
}
