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
import { FilterTeamUsersInput } from "@/modules/organizations/attributes/options/inputs/filter-users-by-options.input";
import { FilterUsersByOptionsOutput } from "@/modules/organizations/attributes/options/outputs/filter-users-by-options.output";
import { UserItem } from "@/modules/organizations/attributes/options/outputs/filter-users-by-options.output";
import { OrganizationAttributeOptionService } from "@/modules/organizations/attributes/options/services/organization-attributes-option.service";
import { Controller, UseGuards, Get, Param, ParseIntPipe, Query } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/users",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, IsTeamInOrg, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@DocsTags("Orgs / Teams / Users")
@ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
@ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
@ApiHeader(OPTIONAL_API_KEY_HEADER)
export class OrganizationsTeamsUsersController {
  constructor(private readonly organizationsAttributesOptionsService: OrganizationAttributeOptionService) {}

  @Roles("ORG_MEMBER")
  @PlatformPlan("ESSENTIALS")
  @Get()
  @ApiOperation({ summary: "Get users filtered by attribute options" })
  async getUsersByAttributeOptions(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() query: FilterTeamUsersInput
  ): Promise<FilterUsersByOptionsOutput> {
    const users = await this.organizationsAttributesOptionsService.getUsersByAttributeOptions(
      orgId,
      teamId,
      query.attributeOptionIds,
      query.attributeQueryOperator
    );

    return {
      status: SUCCESS_STATUS,
      data: users as UserItem[],
    };
  }
}
