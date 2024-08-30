import {
  Controller,
  UseGuards,
  Get,
  Post,
  Param,
  ParseIntPipe,
  Body,
  Patch,
  Delete,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Query,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { API_VERSIONS_VALUES } from "src/lib/api-versions";
import { PlatformPlan } from "src/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "src/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "src/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "src/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "src/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "src/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "src/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "src/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "src/modules/auth/guards/teams/is-team-in-org.guard";
import { CreateTeamEventTypeOutput } from "src/modules/organizations/controllers/event-types/outputs/teams/create-team-event-type.output";
import { DeleteTeamEventTypeOutput } from "src/modules/organizations/controllers/event-types/outputs/teams/delete-team-event-type.output";
import { GetTeamEventTypeOutput } from "src/modules/organizations/controllers/event-types/outputs/teams/get-team-event-type.output";
import { GetTeamEventTypesOutput } from "src/modules/organizations/controllers/event-types/outputs/teams/get-team-event-types.output";
import { UpdateTeamEventTypeOutput } from "src/modules/organizations/controllers/event-types/outputs/teams/update-team-event-type.output";
import { OrganizationsEventTypesService } from "src/modules/organizations/services/event-types/organizations-event-types.service";
import { UserWithProfile } from "src/modules/users/users.repository";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreateTeamEventTypeInput_2024_06_14,
  GetTeamEventTypesQuery_2024_06_14,
  SkipTakePagination,
  UpdateTeamEventTypeInput_2024_06_14,
} from "@calcom/platform-types";

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Organizations Event Types")
export class OrganizationsEventTypesController {
  constructor(private readonly organizationsEventTypesService: OrganizationsEventTypesService) {}

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Post("/teams/:teamId/event-types")
  async createTeamEventType(
    @GetUser() user: UserWithProfile,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() bodyEventType: CreateTeamEventTypeInput_2024_06_14
  ): Promise<CreateTeamEventTypeOutput> {
    const eventType = await this.organizationsEventTypesService.createTeamEventType(
      user,
      teamId,
      orgId,
      bodyEventType
    );

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/teams/:teamId/event-types/:eventTypeId")
  async getTeamEventType(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("eventTypeId") eventTypeId: number
  ): Promise<GetTeamEventTypeOutput> {
    const eventType = await this.organizationsEventTypesService.getTeamEventType(teamId, eventTypeId);

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @UseGuards(IsOrgGuard, IsTeamInOrg, IsAdminAPIEnabledGuard)
  @Get("/teams/:teamId/event-types")
  async getTeamEventTypes(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: GetTeamEventTypesQuery_2024_06_14
  ): Promise<GetTeamEventTypesOutput> {
    const { eventSlug } = queryParams;
    if (eventSlug) {
      const eventType = await this.organizationsEventTypesService.getTeamEventTypeBySlug(teamId, eventSlug);

      return {
        status: SUCCESS_STATUS,
        data: eventType ? [eventType] : [],
      };
    }

    const eventTypes = await this.organizationsEventTypesService.getTeamEventTypes(teamId);

    return {
      status: SUCCESS_STATUS,
      data: eventTypes,
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/teams/event-types")
  async getTeamsEventTypes(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetTeamEventTypesOutput> {
    const { skip, take } = queryParams;
    const eventTypes = await this.organizationsEventTypesService.getTeamsEventTypes(orgId, skip, take);

    return {
      status: SUCCESS_STATUS,
      data: eventTypes,
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Patch("/teams/:teamId/event-types/:eventTypeId")
  async updateTeamEventType(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("eventTypeId") eventTypeId: number,
    @GetUser() user: UserWithProfile,
    @Body() bodyEventType: UpdateTeamEventTypeInput_2024_06_14
  ): Promise<UpdateTeamEventTypeOutput> {
    const eventType = await this.organizationsEventTypesService.updateTeamEventType(
      eventTypeId,
      teamId,
      bodyEventType,
      user
    );

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Delete("/teams/:teamId/event-types/:eventTypeId")
  @HttpCode(HttpStatus.OK)
  async deleteTeamEventType(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("eventTypeId") eventTypeId: number
  ): Promise<DeleteTeamEventTypeOutput> {
    const eventType = await this.organizationsEventTypesService.deleteTeamEventType(teamId, eventTypeId);

    return {
      status: SUCCESS_STATUS,
      data: {
        id: eventTypeId,
        title: eventType.title,
      },
    };
  }
}
