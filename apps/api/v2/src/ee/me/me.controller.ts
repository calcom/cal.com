import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { Controller, UseGuards, Get } from "@nestjs/common";
import { User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "me",
  version: "2",
})
export class MeController {
  @Get("/")
  @UseGuards(AccessTokenGuard)
  async getMe(@GetUser() user: User): Promise<ApiResponse<UserReturned>> {
    const TWELVE_HOUR_TIME_FORMAT = 12;

    return {
      status: SUCCESS_STATUS,
      data: {
        id: user.id,
        email: user.email,
        timeFormat: user.timeFormat || TWELVE_HOUR_TIME_FORMAT,
        defaultScheduleId: user.defaultScheduleId,
        weekStart: user.weekStart,
        timeZone: user.timeZone,
      },
    };
  }
}

export type UserReturned = Pick<
  User,
  "id" | "email" | "timeFormat" | "defaultScheduleId" | "weekStart" | "timeZone"
>;
