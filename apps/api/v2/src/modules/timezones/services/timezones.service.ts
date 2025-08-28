import { RedisService } from "@/modules/redis/redis.service";
import { Injectable } from "@nestjs/common";

import { cityTimezonesHandler } from "@calcom/platform-libraries";
import type { CityTimezones } from "@calcom/platform-libraries";

@Injectable()
export class TimezonesService {
  constructor(private readonly redisService: RedisService) {}

  async getCityTimeZones(): Promise<CityTimezones> {
    return await cityTimezonesHandler();
  }
}
