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
import { CreateRoutingFormResponseInput } from "@/modules/organizations/routing-forms/inputs/create-routing-form-response.input";
import { GetRoutingFormResponsesParams } from "@/modules/organizations/routing-forms/inputs/get-routing-form-responses-params.input";
import { UpdateRoutingFormResponseInput } from "@/modules/organizations/routing-forms/inputs/update-routing-form-response.input";
import { CreateRoutingFormResponseOutput } from "@/modules/organizations/routing-forms/outputs/create-routing-form-response.output";
import { UpdateRoutingFormResponseOutput } from "@/modules/organizations/routing-forms/outputs/update-routing-form-response.output";
import { GetRoutingFormResponsesOutput } from "@/modules/organizations/teams/routing-forms/outputs/get-routing-form-responses.output";
import { OrganizationsTeamsRoutingFormsResponsesService } from "@/modules/organizations/teams/routing-forms/services/organizations-teams-routing-forms-responses.service";
import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  ParseIntPipe,
  Query,
  UseGuards,
  Body,
  Req,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Request } from "express";

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
  RolesGuard,
  IsAdminAPIEnabledGuard
)
@ApiHeader(API_KEY_HEADER)
export class OrganizationsTeamsRoutingFormsResponsesController {
  constructor(
    private readonly organizationsTeamsRoutingFormsResponsesService: OrganizationsTeamsRoutingFormsResponsesService
  ) {}

  @Get("/")
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
      await this.organizationsTeamsRoutingFormsResponsesService.getTeamRoutingFormResponses(
        teamId,
        routingFormId,
        skip ?? 0,
        take ?? 250,
        { ...(filters ?? {}) }
      );

    return {
      status: SUCCESS_STATUS,
      data: routingFormResponses,
    };
  }

  @Post("/")
  @ApiOperation({ summary: "Create routing form response and get available slots" })
  @Roles("TEAM_MEMBER")
  @PlatformPlan("ESSENTIALS")
  async createRoutingFormResponse(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("routingFormId") routingFormId: string,
    @Query() query: CreateRoutingFormResponseInput,
    @Req() request: Request
  ): Promise<CreateRoutingFormResponseOutput> {
    const result =
      await this.organizationsTeamsRoutingFormsResponsesService.createRoutingFormResponseWithSlots(
        routingFormId,
        query,
        request
      );

    return {
      status: SUCCESS_STATUS,
      data: result,
    };
  }

  @Patch("/:responseId")
  @ApiOperation({ summary: "Update routing form response" })
  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  async updateRoutingFormResponse(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("routingFormId") routingFormId: string,
    @Param("responseId", ParseIntPipe) responseId: number,
    @Body() updateRoutingFormResponseInput: UpdateRoutingFormResponseInput
  ): Promise<UpdateRoutingFormResponseOutput> {
    const updatedResponse =
      await this.organizationsTeamsRoutingFormsResponsesService.updateTeamRoutingFormResponse(
        teamId,
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
