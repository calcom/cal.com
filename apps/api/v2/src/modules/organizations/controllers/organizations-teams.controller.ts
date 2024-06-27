import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { GetOrg } from "@/modules/auth/decorators/get-org/get-org.decorator";
import { GetTeam } from "@/modules/auth/decorators/get-team/get-team.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { Controller, UseGuards, Get, Param, ParseIntPipe } from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";
import { Team } from "@calcom/prisma/client";

@Controller({
  path: "/v2/organizations/:orgId/teams",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard)
@DocsTags("Organizations Teams")
export class OrganizationsTeamsController {
  @Get()
  async getAllTeams(
    @Param("orgId", ParseIntPipe) orgId: number,
    @GetOrg() organization: Team,
    @GetOrg("name") orgName: string
  ): Promise<ApiResponse<Team[]>> {
    console.log(orgId, organization, orgName);
    return {
      status: SUCCESS_STATUS,
      data: [],
    };
  }

  @UseGuards(IsTeamInOrg, RolesGuard)
  @Roles("ORG_ADMIN")
  @Get("/:teamId")
  async getTeam(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @GetOrg() organization: Team,
    @GetTeam() team: Team,
    @GetOrg("name") orgName: string
  ): Promise<ApiResponse<Team>> {
    console.log(teamId, orgId, organization, team, orgName);
    return {
      status: SUCCESS_STATUS,
      data: team,
    };
  }
}
