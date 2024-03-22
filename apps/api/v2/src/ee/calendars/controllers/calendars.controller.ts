import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { UserWithProfile } from "@/modules/users/users.repository";
import { Controller, Get, Logger, UseGuards, Query } from "@nestjs/common";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ConnectedDestinationCalendars } from "@calcom/platform-libraries";
import { CalendarBusyTimesInput } from "@calcom/platform-types";
import { ApiResponse } from "@calcom/platform-types";
import { EventBusyDate } from "@calcom/types/Calendar";

@Controller({
  path: "ee/calendars",
  version: "2",
})
@UseGuards(AccessTokenGuard)
export class CalendarsController {
  private readonly logger = new Logger("ee overlay calendars controller");

  constructor(private readonly calendarsService: CalendarsService) {}

  @Get("/busy-times")
  async getBusyTimes(
    @Query() queryParams: CalendarBusyTimesInput,
    @GetUser() user: UserWithProfile
  ): Promise<ApiResponse<EventBusyDate[]>> {
    const { loggedInUsersTz, dateFrom, dateTo, calendarsToLoad } = queryParams;
    if (!dateFrom || !dateTo) {
      return {
        status: SUCCESS_STATUS,
        data: [],
      };
    }

    const busyTimes = await this.calendarsService.getBusyTimes(
      calendarsToLoad,
      user.id,
      dateFrom,
      dateTo,
      loggedInUsersTz
    );

    return {
      status: SUCCESS_STATUS,
      data: busyTimes,
    };
  }

  @Get("/")
  async getCalendars(@GetUser("id") userId: number): Promise<ApiResponse<ConnectedDestinationCalendars>> {
    const calendars = await this.calendarsService.getCalendars(userId);

    return {
      status: SUCCESS_STATUS,
      data: calendars,
    };
  }
}
