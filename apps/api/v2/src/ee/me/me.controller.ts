import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { UpdateUserInput } from "@/modules/users/inputs/update-user.input";
import { UsersRepository } from "@/modules/users/users.repository";
import { Controller, UseGuards, Get, Patch, Body } from "@nestjs/common";
import { User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { UserResponse, userSchemaResponse } from "@calcom/platform-types";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "me",
  version: "2",
})
@UseGuards(AccessTokenGuard)
export class MeController {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly schedulesRepository: SchedulesService
  ) {}

  @Get("/")
  async getMe(@GetUser() user: User): Promise<ApiResponse<UserResponse>> {
    const me = userSchemaResponse.parse(user);

    return {
      status: SUCCESS_STATUS,
      data: me,
    };
  }

  @Patch("/")
  async updateMe(
    @GetUser() user: User,
    @Body() bodySchedule: UpdateUserInput
  ): Promise<ApiResponse<UserResponse>> {
    const updatedUser = await this.usersRepository.update(user.id, bodySchedule);
    if (bodySchedule.timeZone && user.defaultScheduleId) {
      await this.schedulesRepository.updateUserSchedule(user.id, user.defaultScheduleId, {
        timeZone: bodySchedule.timeZone,
      });
    }

    const me = userSchemaResponse.parse(updatedUser);

    return {
      status: SUCCESS_STATUS,
      data: me,
    };
  }
}
