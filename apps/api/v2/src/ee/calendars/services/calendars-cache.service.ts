import type { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/platform-libraries";
import { Injectable } from "@nestjs/common";
import { RedisService } from "@/modules/redis/redis.service";

export const REDIS_CALENDARS_CACHE_KEY = (userId: number) => `apiv2:user:${userId}:calendars`;
export const CALENDARS_CACHE_TTL_MS = 10_000;

type ConnectedDestinationCalendars = Awaited<
  ReturnType<typeof getConnectedDestinationCalendarsAndEnsureDefaultsInDb>
>;

@Injectable()
export class CalendarsCacheService {
  constructor(private readonly redisService: RedisService) {}

  async deleteConnectedAndDestinationCalendarsCache(userId: number) {
    await this.redisService.del(REDIS_CALENDARS_CACHE_KEY(userId));
  }

  async getConnectedAndDestinationCalendarsCache(userId: number) {
    const cachedResult = await this.redisService.get<ConnectedDestinationCalendars>(
      REDIS_CALENDARS_CACHE_KEY(userId)
    );
    return cachedResult;
  }

  async setConnectedAndDestinationCalendarsCache(
    userId: number,
    calendars: ConnectedDestinationCalendars
  ): Promise<void> {
    await this.redisService.set<ConnectedDestinationCalendars>(REDIS_CALENDARS_CACHE_KEY(userId), calendars, {
      ttl: CALENDARS_CACHE_TTL_MS,
    });
  }
}
