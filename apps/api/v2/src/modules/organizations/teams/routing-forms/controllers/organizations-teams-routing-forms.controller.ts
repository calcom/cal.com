import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RoutingFormOutput } from "@/modules/organizations/teams/routing-forms/outputs/routing-form.output";
import { OrganizationsTeamsRoutingFormsService } from "@/modules/organizations/teams/routing-forms/services/organizations-teams-routing-forms-responses.service";
import { Controller, Get, Param, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { GetRoutingFormOutput } from "../outputs/get-routing-form-responses.output";

@Controller({
  path: "/v2/organizations/:orgId/teams/:teamId/routing-forms/:formId",
  version: API_VERSIONS_VALUES,
})
@ApiTags("Organizations Routing Forms")
@UseGuards(ApiAuthGuard, IsOrgGuard, IsAdminAPIEnabledGuard)
export class OrganizationsTeamsRoutingFormsController {
  constructor(
    private readonly organizationsTeamsRoutingFormsService: OrganizationsTeamsRoutingFormsService
  ) {}

  @Get()
  @ApiOperation({ summary: "Get routing form" })
  async getRoutingForm(@Param("formId") formId: string): Promise<GetRoutingFormOutput> {
    const routingForm = await this.organizationsTeamsRoutingFormsService.getRoutingFormWithResponses(formId);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(RoutingFormOutput, routingForm, { strategy: "excludeAll" }),
    };
  }
}
