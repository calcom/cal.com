import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { TeamsSchedulesService } from "@/modules/teams/schedules/services/teams-schedules.service";
import { Controller, UseGuards, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetSchedulesOutput_2024_06_11, SkipTakePagination } from "@calcom/platform-types";

@Controller({
  path: "/v2/teams/:teamId/schedules",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, RolesGuard)
@DocsTags("Teams / Schedules")
@ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
export class TeamsSchedulesController {
  constructor(private teamsSchedulesService: TeamsSchedulesService) {}

  @Roles("TEAM_ADMIN")
  @Get("/")
  @ApiOperation({
    summary: "Get all team member schedules",
  })
  async getTeamSchedules(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetSchedulesOutput_2024_06_11> {
    const { skip, take } = queryParams;

    const schedules = await this.teamsSchedulesService.getTeamSchedules(teamId, skip, take);

    return {
      status: SUCCESS_STATUS,
      data: schedules,
    };
  }
}
