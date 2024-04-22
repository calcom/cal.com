import { Injectable } from "@nestjs/common";

import { cityTimezonesHandler } from "@calcom/platform-libraries";

@Injectable()
export class TimezonesService {
  async getCityTimeZones() {
    return cityTimezonesHandler();
  }
}
