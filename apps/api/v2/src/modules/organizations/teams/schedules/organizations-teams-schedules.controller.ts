import { SchedulesService_2024_06_11 } from "@/ee/schedules/schedules_2024_06_11/services/schedules.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { IsUserInOrgTeam } from "@/modules/auth/guards/users/is-user-in-org-team.guard";
import { Controller, UseGuards, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { GetSchedulesOutput_2024_06_11 } from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, IsTeamInOrg, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Teams / Schedules")
export class OrganizationsTeamsSchedulesController {
  constructor(private schedulesService: SchedulesService_2024_06_11) {}

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(IsUserInOrgTeam)
  @Get("/users/:userId/schedules")
  @DocsTags("Orgs / Teams / Users / Schedules")
  @ApiOperation({ summary: "Get schedules of a team member" })
  async getUserSchedules(
    @Param("userId", ParseIntPipe) userId: number
  ): Promise<GetSchedulesOutput_2024_06_11> {
    const schedules = await this.schedulesService.getUserSchedules(userId);

    return {
      status: SUCCESS_STATUS,
      data: schedules,
    };
  }
}
