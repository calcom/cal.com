import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { GetRoutingFormResponsesParams } from "@/modules/organizations/routing-forms/inputs/get-routing-form-responses-params.input";
import {
  GetRoutingFormsOutput,
  RoutingFormOutput,
} from "@/modules/organizations/routing-forms/outputs/get-routing-forms.output";
import { OrganizationsTeamsRoutingFormsService } from "@/modules/organizations/teams/routing-forms/services/organizations-teams-routing-forms.service";
import { Controller, Get, Param, Query, UseGuards, ParseIntPipe } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/routing-forms",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@ApiTags("Orgs / Teams / Routing forms")
@ApiHeader(API_KEY_HEADER)
export class OrganizationsTeamsRoutingFormsController {
  constructor(
    private readonly organizationsTeamsRoutingFormsService: OrganizationsTeamsRoutingFormsService
  ) {}

  @Get()
  @ApiOperation({ summary: "Get team routing forms" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  async getTeamRoutingForms(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: GetRoutingFormResponsesParams
  ): Promise<GetRoutingFormsOutput> {
    const { skip, take, ...filters } = queryParams;

    const routingForms = await this.organizationsTeamsRoutingFormsService.getTeamRoutingForms(
      teamId,
      skip ?? 0,
      take ?? 250,
      { ...(filters ?? {}) }
    );

    return {
      status: SUCCESS_STATUS,
      data: routingForms.map((form) => plainToClass(RoutingFormOutput, form)),
    };
  }
}
