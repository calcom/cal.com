import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { TimezonesService } from "@/modules/timezones/services/timezones.service";
import { Controller, Get } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { CityTimezones } from "@calcom/platform-libraries-0.0.2";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/timezones",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Timezones")
export class TimezonesController {
  constructor(private readonly timezonesService: TimezonesService) {}

  @Get("/")
  async getTimeZones(): Promise<ApiResponse<CityTimezones>> {
    const timeZones = await this.timezonesService.getCityTimeZones();

    return {
      status: SUCCESS_STATUS,
      data: timeZones,
    };
  }
}
