import { CalendarsService } from "@/ee/calendars/services/calendars.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { Controller, Get, UseGuards } from "@nestjs/common";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { Calendars } from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "calendars",
  version: "2",
})
@UseGuards(AccessTokenGuard)
export class CalendarsController {
  constructor(private readonly calendarsService: CalendarsService) {}

  @Get("/")
  async getCalendars(@GetUser("id") userId: number): Promise<ApiResponse<{ calendars: Calendars }>> {
    const calendars = await this.calendarsService.getCalendars(userId);

    return {
      status: SUCCESS_STATUS,
      data: {
        calendars,
      },
    };
  }
}
