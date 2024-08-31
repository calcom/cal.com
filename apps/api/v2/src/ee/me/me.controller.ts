import { Controller, UseGuards, Get, Patch, Body } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { GetMeOutput } from "src/ee/me/outputs/get-me.output";
import { UpdateMeOutput } from "src/ee/me/outputs/update-me.output";
import { SchedulesService_2024_04_15 } from "src/ee/schedules/schedules_2024_04_15/services/schedules.service";
import { API_VERSIONS_VALUES } from "src/lib/api-versions";
import { GetUser } from "src/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "src/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "src/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "src/modules/auth/guards/permissions/permissions.guard";
import { UpdateManagedUserInput } from "src/modules/users/inputs/update-managed-user.input";
import { UsersService } from "src/modules/users/services/users.service";
import { UserWithProfile, UsersRepository } from "src/modules/users/users.repository";

import { PROFILE_READ, PROFILE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import { userSchemaResponse } from "@calcom/platform-types";

@Controller({
  path: "/v2/me",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, PermissionsGuard)
@DocsTags("Me")
export class MeController {
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly schedulesService: SchedulesService_2024_04_15,
    private readonly usersService: UsersService
  ) {}

  @Get("/")
  @Permissions([PROFILE_READ])
  async getMe(@GetUser() user: UserWithProfile): Promise<GetMeOutput> {
    const organization = this.usersService.getUserMainProfile(user)?.organization;
    const me = userSchemaResponse.parse(
      organization
        ? {
            ...user,
            organizationId: organization.id,
            organization: {
              id: organization.id,
              isPlatform: organization.isPlatform,
            },
          }
        : user
    );
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
  ): Promise<UpdateMeOutput> {
    const updatedUser = await this.usersRepository.update(user.id, bodySchedule);
    if (bodySchedule.timeZone && user.defaultScheduleId) {
      await this.schedulesService.updateUserSchedule(user, user.defaultScheduleId, {
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
