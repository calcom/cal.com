import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { GetRoutingFormResponsesOutput } from "@/modules/organizations/routing-forms/outputs/get-routing-form-responses.output";
import { OrganizationsRoutingFormsResponsesService } from "@/modules/organizations/routing-forms/services/organizations-routing-forms-responses.service";
import { Body, Controller, Get, Param, Patch, Query, UseGuards, ParseIntPipe } from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";

import { SUCCESS_STATUS } from "@calcom/platform-constants";

import { GetRoutingFormResponsesParams } from "../inputs/get-routing-form-responses-params.input";
import { UpdateRoutingFormResponseInput } from "../inputs/update-routing-form-response.input";
import { UpdateRoutingFormResponseOutput } from "../outputs/update-routing-form-response.output";

@Controller({
  path: "/v2/organizations/:orgId/routing-forms/:routingFormId/responses",
  version: API_VERSIONS_VALUES,
})
@UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
@ApiTags("Orgs / Routing forms")
@ApiHeader(API_KEY_HEADER)
export class OrganizationsRoutingFormsResponsesController {
  constructor(
    private readonly organizationsRoutingFormsResponsesService: OrganizationsRoutingFormsResponsesService
  ) {}

  @Get("/")
  @ApiOperation({ summary: "Get routing form responses" })
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  async getRoutingFormResponses(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("routingFormId") routingFormId: string,
    @Query() queryParams: GetRoutingFormResponsesParams
  ): Promise<GetRoutingFormResponsesOutput> {
    const { skip, take, ...filters } = queryParams;

    const responses =
      await this.organizationsRoutingFormsResponsesService.getOrganizationRoutingFormResponses(
        orgId,
        routingFormId,
        skip ?? 0,
        take ?? 250,
        filters
      );

    return {
      status: SUCCESS_STATUS,
      data: responses,
    };
  }

  @Patch("/:responseId")
  @ApiOperation({ summary: "Update routing form response" })
  @Roles("ORG_ADMIN")
  @PlatformPlan("ESSENTIALS")
  async updateRoutingFormResponse(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("routingFormId") routingFormId: string,
    @Param("responseId", ParseIntPipe) responseId: number,
    @Body() updateRoutingFormResponseInput: UpdateRoutingFormResponseInput
  ): Promise<UpdateRoutingFormResponseOutput> {
    const updatedResponse = await this.organizationsRoutingFormsResponsesService.updateRoutingFormResponse(
      orgId,
      routingFormId,
      responseId,
      updateRoutingFormResponseInput
    );

    return {
      status: SUCCESS_STATUS,
      data: updatedResponse,
    };
  }
}
