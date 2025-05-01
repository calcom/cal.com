import { Injectable } from "@nestjs/common";
import { RedisService } from "@calcom/features/redis/RedisService";

@Injectable()
export class OutlookCacheService {
  private readonly redis: RedisService;
  constructor() {
    this.redis = new RedisService();
  }

  async updateCache(userId: number, calendarId: string, data: any, ttlSeconds = 1800) {
    const key = this.getCacheKey(userId, calendarId);
    await this.redis.set(key, JSON.stringify(data));
    await this.redis.expire(key, ttlSeconds);
  }

  async getFromCache(userId: number, calendarId: string) {
    const key = this.getCacheKey(userId, calendarId);
    const cached = await this.redis.get<string>(key);
    if (!cached) return null;
    try {
      return JSON.parse(cached);
    } catch {
      return null;
    }
  }

  async invalidateCache(userId: number, calendarId: string) {
    const key = this.getCacheKey(userId, calendarId);
    await this.redis.del(key);
  }

  async invalidateCacheByResource(resource: string) {
    // Parse resource to extract userId/calendarId if possible
    // Placeholder: Invalidate all keys matching the resource
    // You may want to improve this logic for your use case
    const pattern = `outlook:cache:*:${resource}:*`;
    const keys = await this.redis.keys(pattern);
    for (const key of keys) {
      await this.redis.del(key);
    }
  }

  private getCacheKey(userId: number, calendarId: string) {
    return `outlook:cache:${userId}:${calendarId}`;
  }
}
