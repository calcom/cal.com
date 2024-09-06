import { InputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/input-event-types.service";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PlatformPlanGuard } from "@/modules/auth/guards/billing/platform-plan.guard";
import { IsAdminAPIEnabledGuard } from "@/modules/auth/guards/organizations/is-admin-api-enabled.guard";
import { IsOrgGuard } from "@/modules/auth/guards/organizations/is-org.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { IsTeamInOrg } from "@/modules/auth/guards/teams/is-team-in-org.guard";
import { CreateTeamEventTypeOutput } from "@/modules/organizations/controllers/event-types/outputs/teams/create-team-event-type.output";
import { DeleteTeamEventTypeOutput } from "@/modules/organizations/controllers/event-types/outputs/teams/delete-team-event-type.output";
import { GetTeamEventTypeOutput } from "@/modules/organizations/controllers/event-types/outputs/teams/get-team-event-type.output";
import { GetTeamEventTypesOutput } from "@/modules/organizations/controllers/event-types/outputs/teams/get-team-event-types.output";
import { UpdateTeamEventTypeOutput } from "@/modules/organizations/controllers/event-types/outputs/teams/update-team-event-type.output";
import { InputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/input.service";
import { OrganizationsEventTypesService } from "@/modules/organizations/services/event-types/organizations-event-types.service";
import {
  DatabaseTeamEventType,
  OutputOrganizationsEventTypesService,
} from "@/modules/organizations/services/event-types/output.service";
import { UserWithProfile } from "@/modules/users/users.repository";
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
import { plainToClass } from "class-transformer";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  CreateTeamEventTypeInput_2024_06_14,
  GetTeamEventTypesQuery_2024_06_14,
  SkipTakePagination,
  TeamEventTypeOutput_2024_06_14,
  UpdateTeamEventTypeInput_2024_06_14,
} from "@calcom/platform-types";

export type EventTypeHandlerResponse = {
  data: DatabaseTeamEventType[] | DatabaseTeamEventType;
  status: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
};

@Controller({
  path: "/v2/organizations/:orgId",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Organizations Event Types")
export class OrganizationsEventTypesController {
  constructor(
    private readonly organizationsEventTypesService: OrganizationsEventTypesService,
    private readonly inputService: InputOrganizationsEventTypesService,
    private readonly inputUserEventTypesService: InputEventTypesService_2024_06_14,
    private readonly outputOrganizationsEventTypesService: OutputOrganizationsEventTypesService
  ) {}

  private async transformEventType(item: DatabaseTeamEventType): Promise<TeamEventTypeOutput_2024_06_14> {
    return plainToClass(
      TeamEventTypeOutput_2024_06_14,
      await this.outputOrganizationsEventTypesService.getResponseTeamEventType(item),
      { strategy: "exposeAll" }
    );
  }

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
    await this.inputService.validateHosts(teamId, bodyEventType.hosts);
    const transformedBody = await this.inputService.transformInputCreateTeamEventType(teamId, bodyEventType);

    await this.inputUserEventTypesService.validateEventTypeInputs(
      undefined,
      transformedBody.seatsPerTimeSlot > 0,
      transformedBody.locations,
      transformedBody.requiresConfirmation
    );

    const eventType = await this.organizationsEventTypesService.createTeamEventType(
      user,
      teamId,
      orgId,
      transformedBody
    );

    const transformedData = Array.isArray(eventType)
      ? await Promise.all(eventType.map((item) => this.transformEventType(item)))
      : await this.transformEventType(eventType);

    return {
      status: SUCCESS_STATUS,
      data: transformedData,
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

    const transformedData = await this.transformEventType(eventType);

    return {
      status: SUCCESS_STATUS,
      data: transformedData,
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
      const data = eventType ? [eventType] : [];

      const transformedData = await Promise.all(data.map((item) => this.transformEventType(item)));

      return {
        status: SUCCESS_STATUS,
        data: transformedData,
      };
    }

    const eventTypes = await this.organizationsEventTypesService.getTeamEventTypes(teamId);
    const transformedData = await Promise.all(eventTypes.map((item) => this.transformEventType(item)));

    return {
      status: SUCCESS_STATUS,
      data: transformedData,
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
    const transformedData = await Promise.all(eventTypes.map((item) => this.transformEventType(item)));

    return {
      status: SUCCESS_STATUS,
      data: transformedData,
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
    await this.inputService.validateHosts(teamId, bodyEventType.hosts);
    const transformedBody = await this.inputService.transformInputUpdateTeamEventType(
      eventTypeId,
      teamId,
      bodyEventType
    );

    await this.inputUserEventTypesService.validateEventTypeInputs(
      eventTypeId,
      transformedBody.seatsPerTimeSlot > 0,
      transformedBody.locations,
      transformedBody.requiresConfirmation
    );

    const eventType = await this.organizationsEventTypesService.updateTeamEventType(
      eventTypeId,
      teamId,
      transformedBody,
      user
    );

    const transformedData = Array.isArray(eventType)
      ? await Promise.all(eventType.map((item) => this.transformEventType(item)))
      : await this.transformEventType(eventType);

    return {
      status: SUCCESS_STATUS,
      data: transformedData,
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Delete("/teams/:teamId/event-types/:eventTypeId")
  @HttpCode(HttpStatus.OK)
  async deleteTeamEventType(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number
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
