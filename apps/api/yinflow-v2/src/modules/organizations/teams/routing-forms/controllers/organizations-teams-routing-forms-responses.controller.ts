import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { RoutingFormResponseOutput } from "@calcom/platform-types";

import { API_VERSIONS_VALUES } from "../../../../../lib/api-versions";
import { PlatformPlan } from "../../../../auth/decorators/billing/platform-plan.decorator";
import { Roles } from "../../../../auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "../../../../auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "../../../../auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "../../../../auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "../../../../auth/guards/organizations/is-org.guard";
import { IsRoutingFormInTeam } from "../../../../auth/guards/routing-forms/is-routing-form-in-team.guard";
import { IsTeamInOrg } from "../../../../auth/guards/teams/is-team-in-org.guard";
import { RoutingFormsResponsesService } from "../../../../routing-forms-responses/services/routing-forms-responses.service";
import { GetRoutingFormResponsesOutput } from "../outputs/get-routing-form-responses.output";

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
export class OrganizationsTeamsRoutingFormsResponsesController {
  constructor(private readonly routingFormsResponsesService: RoutingFormsResponsesService) {}

  @Get()
  @ApiOperation({ summary: "Get routing form responses" })
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  async getRoutingFormResponses(
    @Param("routingFormId") routingFormId: string
  ): Promise<GetRoutingFormResponsesOutput> {
    const routingFormResponses = await this.routingFormsResponsesService.getRoutingFormResponses(
      routingFormId
    );

    return {
      status: SUCCESS_STATUS,
      data: routingFormResponses,
    };
  }
}
