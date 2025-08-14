import { OutputSchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/output-schedules.service";
import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { VERSION_2024_06_14, VERSION_2024_06_11 } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { TeamsRepository } from "@/modules/teams/teams/teams.repository";
import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SCHEDULE_READ, SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetSchedulesOutput_2024_06_11, SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/teams/:teamId/schedules",
  version: [VERSION_2024_06_14, VERSION_2024_06_11],
})
@UseGuards(ApiAuthGuard, PermissionsGuard, RolesGuard, PlatformPlanGuard)
@DocsTags("Teams / Schedules")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_06_11}`,
  example: VERSION_2024_06_11,
  required: true,
  schema: {
    default: VERSION_2024_06_11,
  },
})
@ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
export class TeamsSchedulesController_2024_06_11 {
  constructor(
    private readonly schedulesService: SchedulesService_2024_06_11,
    private readonly teamsRepository: TeamsRepository,
    private readonly outputSchedulesService: OutputSchedulesService_2024_06_11
  ) {}

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Get("/")
  @Permissions([SCHEDULE_READ])
  @ApiOperation({
    summary: "Get all team schedules",
    description: "Get all schedules of team members.",
  })
  async getTeamSchedules(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetSchedulesOutput_2024_06_11> {
    const { skip, take } = queryParams;

    const schedules = await this.schedulesService.getSchedulesByUserIds(teamId, skip, take);

    return {
      status: SUCCESS_STATUS,
      data: schedules,
    };
  }
}
