import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsRoutingFormInTeam } from "@/modules/auth/guards/routing-forms/is-routing-form-in-team.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { GetRoutingFormResponsesParams } from "@/modules/organizations/routing-forms/inputs/get-routing-form-responses-params.input";
import { UpdateRoutingFormResponseInput } from "@/modules/organizations/routing-forms/inputs/update-routing-form-response.input";
import { UpdateRoutingFormResponseOutput } from "@/modules/organizations/routing-forms/outputs/update-routing-form-response.output";
import { GetRoutingFormResponsesOutput } from "@/modules/organizations/teams/routing-forms/outputs/get-routing-form-responses.output";
import { OrganizationsTeamsRoutingFormsResponsesService } from "@/modules/organizations/teams/routing-forms/services/organizations-teams-routing-forms-responses.service";
import { Controller, Get, Patch, Param, ParseIntPipe, Query, UseGuards, Body } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/workflows",
  version: API_VERSIONS_VALUES,
})
@ApiTags("Orgs / Teams / Workflows")
@UseGuards(
  ApiAuthGuard,
  IsOrgGuard,
  IsTeamInOrg,
  IsRoutingFormInTeam,
  PlatformPlanGuard,
  RolesGuard,
  IsAdminAPIEnabledGuard
)
@ApiHeader(API_KEY_HEADER)
export class OrganizationsTeamsRoutingFormsResponsesController {
  constructor(
    private readonly organizationsTeamsRoutingFormsResponsesService: OrganizationsTeamsRoutingFormsResponsesService
  ) {}

  @Get("/")
  @ApiOperation({ summary: "Get organization team workflows" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  async getRoutingFormResponses(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: GetRoutingFormResponsesParams
  ): Promise<boolean> {
    const { skip, take, ...filters } = queryParams;

    return false;
  }

  @Patch("/:workflowId")
  @ApiOperation({ summary: "Update workflows" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  async updateRoutingFormResponse(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("workflowId") workflowId: number,
    @Param("responseId", ParseIntPipe) responseId: number,
    @Body() updateRoutingFormResponseInput: UpdateRoutingFormResponseInput
  ): Promise<boolean> {
    return false;
  }
}
