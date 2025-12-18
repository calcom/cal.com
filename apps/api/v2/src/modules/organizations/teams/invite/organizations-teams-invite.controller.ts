import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import {
  OPTIONAL_API_KEY_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { Controller, UseGuards, Post, Param, ParseIntPipe, HttpCode, HttpStatus } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { TeamService } from "@calcom/platform-libraries";

import { CreateInviteOutputDto } from "./outputs/invite.output";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Teams / Invite")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsTeamsInviteController {
  @Post("/invite")
  @Roles("TEAM_ADMIN")
  @ApiOperation({ summary: "Create team invite link" })
  @HttpCode(HttpStatus.OK)
  async createInvite(
    @Param("orgId", ParseIntPipe) _orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<CreateInviteOutputDto> {
    const result = await TeamService.createInvite(teamId);
    return { status: SUCCESS_STATUS, data: result };
  }
}
