import type { CityTimezones } from "@calcom/platform-libraries";
import { cityTimezonesHandler } from "@calcom/platform-libraries";
import { Injectable } from "@nestjs/common";
import { RedisService } from "@/modules/redis/redis.service";

@Injectable()
export class TimezonesService {
  private cacheKey = "cityTimezones";

  constructor(private readonly redisService: RedisService) {}

  async getCityTimeZones(): Promise<CityTimezones> {
    const cachedTimezones = await this.redisService.redis.get(this.cacheKey);
    if (!cachedTimezones) {
      const timezones = await cityTimezonesHandler();
      await this.redisService.redis.set(this.cacheKey, JSON.stringify(timezones), "EX", 60 * 60 * 24);

      return timezones;
    } else {
      return JSON.parse(cachedTimezones) as CityTimezones;
    }
  }
}
