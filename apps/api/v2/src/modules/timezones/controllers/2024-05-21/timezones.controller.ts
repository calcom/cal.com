import { VERSION_2024_05_21_VALUE } from "@/lib/api-versions";
import { TimezonesService } from "@/modules/timezones/services/timezones.service";
import { Controller, Get } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import type { CityTimezones } from "@calcom/platform-libraries-0.0.2";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/timezones",
  version: VERSION_2024_05_21_VALUE,
})
@DocsTags("Timezones")
export class TimezonesController {
  constructor(private readonly timezonesService: TimezonesService) {}

  @Get("/")
  async getTimeZones(): Promise<ApiResponse<CityTimezones>> {
    throw Error("Some sort of different implementation");
  }
}
