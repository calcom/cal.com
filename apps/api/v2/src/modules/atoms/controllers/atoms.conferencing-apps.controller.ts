import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ConnectedApps } from "@calcom/platform-libraries/app-store";
import { ApiResponse } from "@calcom/platform-types";
import { Controller, Get, Param, ParseIntPipe, UseGuards, VERSION_NEUTRAL, Version } from "@nestjs/common";
import { ApiExcludeController as DocsExcludeController, ApiTags as DocsTags } from "@nestjs/swagger";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ConferencingAtomsService } from "@/modules/atoms/services/conferencing-atom.service";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { UserWithProfile } from "@/modules/users/users.repository";

/*
Conferencing endpoints for atoms, split from AtomsController for clarity and maintainability.
These endpoints should not be recommended for use by third party and are excluded from docs.
*/

@Controller({
  path: "/v2/atoms",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Atoms - conferencing endpoints for atoms")
@DocsExcludeController(true)
export class AtomsConferencingAppsController {
  constructor(private readonly conferencingService: ConferencingAtomsService) {}

  @Get("/organizations/:orgId/teams/:teamId/conferencing")
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Version(VERSION_NEUTRAL)
  async listTeamInstalledConferencingApps(
    @GetUser() user: UserWithProfile,
    @Param("teamId", ParseIntPipe) teamId: number
  ): Promise<ApiResponse<ConnectedApps>> {
    const conferencingApps = await this.conferencingService.getTeamConferencingApps(user, teamId);
    return {
      status: SUCCESS_STATUS,
      data: conferencingApps,
    };
  }

  @Get("/conferencing")
  @Version(VERSION_NEUTRAL)
  @UseGuards(ApiAuthGuard)
  async listUserInstalledConferencingApps(
    @GetUser() user: UserWithProfile
  ): Promise<ApiResponse<ConnectedApps>> {
    const conferencingApps = await this.conferencingService.getUserConferencingApps(user);
    return {
      status: SUCCESS_STATUS,
      data: conferencingApps,
    };
  }
}
