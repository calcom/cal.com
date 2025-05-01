import { RedisService } from "./RedisService";
import type { EventBusyDate } from "@calcom/types/Calendar";
import dayjs from "@calcom/dayjs";

// Cache TTL in seconds (30 minutes)
const CACHE_TTL = 30 * 60;

export class CalendarCache {
  private redis: RedisService;

  constructor() {
    this.redis = new RedisService();
  }

  private getCacheKey(userId: number, credentialId: number, dateFrom: string, dateTo: string): string {
    return `calendar:busy:${userId}:${credentialId}:${dateFrom}:${dateTo}`;
  }

  private getGraphSubscriptionKey(userId: number, credentialId: number, calendarId: string): string {
    return `calendar:subscription:${userId}:${credentialId}:${calendarId}`;
  }

  async setBusyTimes(
    userId: number,
    credentialId: number,
    dateFrom: string,
    dateTo: string,
    busyTimes: EventBusyDate[]
  ): Promise<void> {
    const key = this.getCacheKey(userId, credentialId, dateFrom, dateTo);
    await this.redis.set(key, JSON.stringify(busyTimes));
    await this.redis.expire(key, CACHE_TTL);
  }

  async getBusyTimes(
    userId: number,
    credentialId: number,
    dateFrom: string,
    dateTo: string
  ): Promise<EventBusyDate[] | null> {
    const key = this.getCacheKey(userId, credentialId, dateFrom, dateTo);
    const cachedData = await this.redis.get<string>(key);
    
    if (!cachedData) return null;
    
    try {
      return JSON.parse(cachedData) as EventBusyDate[];
    } catch (e) {
      return null;
    }
  }

  async setSubscription(
    userId: number,
    credentialId: number,
    calendarId: string,
    subscriptionId: string,
    expirationDateTime: string
  ): Promise<void> {
    const key = this.getGraphSubscriptionKey(userId, credentialId, calendarId);
    await this.redis.set(key, JSON.stringify({ subscriptionId, expirationDateTime }));
    // Set expiration to 1 hour before the actual subscription expiration
    const ttl = dayjs(expirationDateTime).diff(dayjs(), 'second') - 3600;
    await this.redis.expire(key, ttl);
  }

  async getSubscription(
    userId: number,
    credentialId: number,
    calendarId: string
  ): Promise<{ subscriptionId: string; expirationDateTime: string } | null> {
    const key = this.getGraphSubscriptionKey(userId, credentialId, calendarId);
    const cachedData = await this.redis.get<string>(key);
    
    if (!cachedData) return null;
    
    try {
      return JSON.parse(cachedData);
    } catch (e) {
      return null;
    }
  }

  async invalidateUserCache(userId: number): Promise<void> {
    const pattern = `calendar:busy:${userId}:*`;
    const keys = await this.redis.keys(pattern);
    
    if (keys.length > 0) {
      await Promise.all(keys.map((key) => this.redis.del(key)));
    }
  }
}