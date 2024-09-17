import { Injectable } from "@nestjs/common";

import { cityTimezonesHandler } from "@calcom/platform-libraries";
import type { CityTimezones } from "@calcom/platform-libraries";

@Injectable()
export class TimezonesService {
  async getCityTimeZones(): Promise<CityTimezones> {
    const timezones = await cityTimezonesHandler();

    return timezones;
  }
}
