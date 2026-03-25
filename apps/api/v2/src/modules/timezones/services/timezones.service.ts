import { RedisService } from "@/modules/redis/redis.service";
import { Injectable } from "@nestjs/common";

import { cityTimezonesHandler } from "@calcom/platform-libraries";
import type { CityTimezones } from "@calcom/platform-libraries";

@Injectable()
export class TimezonesService {
  private cacheKey = "cityTimezones";

  constructor(private readonly redisService: RedisService) {}

  async getCityTimeZones(): Promise<CityTimezones> {
    const cachedTimezones = await this.redisService.get<CityTimezones>(this.cacheKey);
    if (!cachedTimezones) {
      const timezones = await cityTimezonesHandler();
      await this.redisService.set(this.cacheKey, timezones, { ttl: 60 * 60 * 24 * 1000 });

      return timezones;
    } else {
      return cachedTimezones;
    }
  }
}
