import { SchedulesService } from "@/ee/schedules/services/schedules.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { UpdateManagedUserInput } from "@/modules/users/inputs/update-managed-user.input";
import { UserWithProfile, UsersRepository } from "@/modules/users/users.repository";
import { Controller, UseGuards, Get, Patch, Body } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { PROFILE_READ, PROFILE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import { UserResponse, userSchemaResponse } from "@calcom/platform-types";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "ee/me",
  version: "2",
})
@UseGuards(AccessTokenGuard, PermissionsGuard)
@DocsTags("Me")
export class MeController {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly schedulesRepository: SchedulesService
  ) {}

  @Get("/")
  @Permissions([PROFILE_READ])
  async getMe(@GetUser() user: UserWithProfile): Promise<ApiResponse<UserResponse>> {
    const me = userSchemaResponse.parse(user);

    return {
      status: SUCCESS_STATUS,
      data: me,
    };
  }

  @Patch("/")
  @Permissions([PROFILE_WRITE])
  async updateMe(
    @GetUser() user: UserWithProfile,
    @Body() bodySchedule: UpdateManagedUserInput
  ): Promise<ApiResponse<UserResponse>> {
    const updatedUser = await this.usersRepository.update(user.id, bodySchedule);
    if (bodySchedule.timeZone && user.defaultScheduleId) {
      await this.schedulesRepository.updateUserSchedule(user, user.defaultScheduleId, {
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
