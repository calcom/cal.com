import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { IsUserInOrgTeam } from "@/modules/auth/guards/users/is-user-in-org-team.guard";
import {
  GetTeamSchedulesQuery,
  GetUserSchedulesQuery,
} from "@/modules/organizations/teams/schedules/inputs/teams-schedules.input";
import { TeamsSchedulesService } from "@/modules/teams/schedules/services/teams-schedules.service";
import { Controller, UseGuards, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetSchedulesOutput_2024_06_11 } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, IsTeamInOrg, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsTeamsSchedulesController {
  constructor(
    private schedulesService: SchedulesService_2024_06_11,

    private teamsSchedulesService: TeamsSchedulesService
  ) {}

  @UseGuards(IsTeamInOrg)
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @Get("/schedules")
  @DocsTags("Orgs / Teams / Schedules")
  @ApiOperation({ summary: "Get all team member schedules" })
  async getTeamSchedules(
    // note(Lauris): putting orgId so swagger is generated correctly
    @Param("orgId", ParseIntPipe) _orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: GetTeamSchedulesQuery
  ): Promise<GetSchedulesOutput_2024_06_11> {
    const { skip, take, eventTypeId } = queryParams;

    const schedules = await this.teamsSchedulesService.getTeamSchedules(teamId, skip, take, eventTypeId);

    return {
      status: SUCCESS_STATUS,
      data: schedules,
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrgTeam)
  @Get("/users/:userId/schedules")
  @DocsTags("Orgs / Teams / Users / Schedules")
  @ApiOperation({
    summary: "Get schedules of a team member",
  })
  async getUserSchedules(
    // note(Lauris): putting orgId and teamId so swagger is generated correctly
    @Param("orgId", ParseIntPipe) _orgId: number,
    @Param("teamId", ParseIntPipe) _teamId: number,
    @Param("userId", ParseIntPipe) userId: number,
    @Query() queryParams: GetUserSchedulesQuery
  ): Promise<GetSchedulesOutput_2024_06_11> {
    const { eventTypeId } = queryParams;
    const schedules = await this.schedulesService.getUserSchedules(userId, eventTypeId);

    return {
      status: SUCCESS_STATUS,
      data: schedules,
    };
  }
}
