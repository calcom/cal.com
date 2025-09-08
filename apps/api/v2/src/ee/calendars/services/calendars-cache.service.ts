import { RedisService } from "@/modules/redis/redis.service";
import { Injectable } from "@nestjs/common";

import type { getConnectedDestinationCalendarsAndEnsureDefaultsInDb } from "@calcom/platform-libraries";

export const REDIS_CALENDARS_CACHE_KEY = (userId: number) => `apiv2:user:${userId}:calendars`;

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

  async setConnectedAndDestinationCalendarsCache(userId: number, calendars: ConnectedDestinationCalendars) {
    await this.redisService.set(REDIS_CALENDARS_CACHE_KEY(userId), JSON.stringify(calendars), { ttl: 10000 });
  }
}
