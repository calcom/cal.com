import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { IsRoutingFormInTeam } from "@/modules/auth/guards/routing-forms/is-routing-form-in-team.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { GetRoutingFormResponsesParams } from "@/modules/organizations/routing-forms/inputs/get-routing-form-responses-params.input";
import { OrganizationsRoutingFormsResponsesService } from "@/modules/organizations/routing-forms/services/organizations-routing-forms-responses.service";
import { GetRoutingFormResponsesOutput } from "@/modules/organizations/teams/routing-forms/outputs/get-routing-form-responses.output";
import { Controller, Get, Param, ParseIntPipe, Query, UseGuards } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/routing-forms/:routingFormId/responses",
  version: API_VERSIONS_VALUES,
})
@ApiTags("Orgs / Teams / Routing forms / Responses")
@UseGuards(
  ApiAuthGuard,
  IsOrgGuard,
  IsTeamInOrg,
  IsRoutingFormInTeam,
  PlatformPlanGuard,
  IsAdminAPIEnabledGuard
)
@ApiHeader(API_KEY_HEADER)
export class OrganizationsTeamsRoutingFormsResponsesController {
  constructor(
    private readonly organizationsRoutingFormsResponsesService: OrganizationsRoutingFormsResponsesService
  ) {}

  @Get()
  @ApiOperation({ summary: "Get organization team routing form responses" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  async getRoutingFormResponses(
    @Param("routingFormId") routingFormId: string,
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: GetRoutingFormResponsesParams
  ): Promise<GetRoutingFormResponsesOutput> {
    const { skip, take, ...filters } = queryParams;

    const routingFormResponses =
      await this.organizationsRoutingFormsResponsesService.getOrganizationRoutingFormResponses(
        orgId,
        routingFormId,
        skip ?? 0,
        take ?? 250,
        { ...(filters ?? {}), teamId }
      );

    return {
      status: SUCCESS_STATUS,
      data: routingFormResponses,
    };
  }
}
