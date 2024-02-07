import { GetOverlayCalendarsBusyTimesInput } from "@/ee/overlay-calendars/inputs/get-overlay-calendars-busy-times.input";
import { OverlayCalendarsService } from "@/ee/overlay-calendars/services/overlay-calendars.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { Controller, Get, Logger, UseGuards, Body } from "@nestjs/common";
import { User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";
import { EventBusyDate } from "@calcom/types/Calendar";

@Controller({
  path: "ee/overlay-calendars",
  version: "2",
})
@UseGuards(AccessTokenGuard)
export class OverlayCalendarController {
  private readonly logger = new Logger("ee overlay calendars controller");

  constructor(private readonly overlayCalendarsService: OverlayCalendarsService) {}

  @Get("/busy-times")
  async getBusyTimes(
    @Body() body: GetOverlayCalendarsBusyTimesInput,
    @GetUser() user: User
  ): Promise<ApiResponse<EventBusyDate[]>> {
    const { loggedInUsersTz, dateFrom, dateTo, calendarsToLoad } = body;
    if (!dateFrom || !dateTo) {
      return {
        status: SUCCESS_STATUS,
        data: [],
      };
    }

    const credentials = await this.overlayCalendarsService.getUniqCalendarCredentials(
      calendarsToLoad,
      user.id
    );
    const composedSelectedCalendars = await this.overlayCalendarsService.getCalendarsWithCredentials(
      credentials,
      calendarsToLoad,
      user.id
    );
    const busyTimes = await this.overlayCalendarsService.getBusyTimes(
      credentials,
      composedSelectedCalendars,
      dateFrom,
      dateTo,
      loggedInUsersTz
    );

    return {
      status: SUCCESS_STATUS,
      data: busyTimes,
    };
  }
}
