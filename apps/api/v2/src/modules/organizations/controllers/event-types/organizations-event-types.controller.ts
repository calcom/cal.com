import { CreatePhoneCallInput } from "@/ee/event-types/event-types_2024_06_14/inputs/create-phone-call.input";
import { CreatePhoneCallOutput } from "@/ee/event-types/event-types_2024_06_14/outputs/create-phone-call.output";
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
import { OutputTeamEventTypesResponsePipe } from "@/modules/organizations/controllers/pipes/event-types/team-event-types-response.transformer";
import { InputOrganizationsEventTypesService } from "@/modules/organizations/services/event-types/input.service";
import { OrganizationsEventTypesService } from "@/modules/organizations/services/event-types/organizations-event-types.service";
import { DatabaseTeamEventType } from "@/modules/organizations/services/event-types/output.service";
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
import { ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import { ERROR_STATUS, SUCCESS_STATUS } from "@calcom/platform-constants";
import { handleCreatePhoneCall } from "@calcom/platform-libraries";
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
@DocsTags("Orgs / Event Types")
export class OrganizationsEventTypesController {
  constructor(
    private readonly organizationsEventTypesService: OrganizationsEventTypesService,
    private readonly inputService: InputOrganizationsEventTypesService,
    private readonly inputUserEventTypesService: InputEventTypesService_2024_06_14,
    private readonly outputTeamEventTypesResponsePipe: OutputTeamEventTypesResponsePipe
  ) {}

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Post("/teams/:teamId/event-types")
  @ApiOperation({ summary: "Create an event type" })
  async createTeamEventType(
    @GetUser() user: UserWithProfile,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() bodyEventType: CreateTeamEventTypeInput_2024_06_14
  ): Promise<CreateTeamEventTypeOutput> {
    const transformedBody = await this.inputService.transformAndValidateCreateTeamEventTypeInput(
      user.id,
      teamId,
      bodyEventType
    );

    const eventType = await this.organizationsEventTypesService.createTeamEventType(
      user,
      teamId,
      orgId,
      transformedBody
    );

    return {
      status: SUCCESS_STATUS,
      data: await this.outputTeamEventTypesResponsePipe.transform(eventType),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/teams/:teamId/event-types/:eventTypeId")
  @ApiOperation({ summary: "Get an event type" })
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
      data: (await this.outputTeamEventTypesResponsePipe.transform(
        eventType
      )) as TeamEventTypeOutput_2024_06_14,
    };
  }

  @Roles("TEAM_ADMIN")
  @Post("/teams/:teamId/event-types/:eventTypeId/create-phone-call")
  @UseGuards(ApiAuthGuard, IsOrgGuard, IsTeamInOrg, RolesGuard)
  @ApiOperation({ summary: "Create a phone call" })
  async createPhoneCall(
    @Param("eventTypeId") eventTypeId: number,
    @Param("orgId", ParseIntPipe) orgId: number,
    @Body() body: CreatePhoneCallInput,
    @GetUser() user: UserWithProfile
  ): Promise<CreatePhoneCallOutput> {
    const data = await handleCreatePhoneCall({
      user: {
        id: user.id,
        timeZone: user.timeZone,
        profile: { organization: { id: orgId } },
      },
      input: { ...body, eventTypeId },
    });

    return {
      status: SUCCESS_STATUS,
      data,
    };
  }

  @UseGuards(IsOrgGuard, IsTeamInOrg, IsAdminAPIEnabledGuard)
  @Get("/teams/:teamId/event-types")
  @ApiOperation({ summary: "Get a team event type" })
  async getTeamEventTypes(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: GetTeamEventTypesQuery_2024_06_14
  ): Promise<GetTeamEventTypesOutput> {
    const { eventSlug } = queryParams;

    if (eventSlug) {
      const eventType = await this.organizationsEventTypesService.getTeamEventTypeBySlug(teamId, eventSlug);

      return {
        status: SUCCESS_STATUS,
        data: await this.outputTeamEventTypesResponsePipe.transform(eventType ? [eventType] : []),
      };
    }

    const eventTypes = await this.organizationsEventTypesService.getTeamEventTypes(teamId);

    return {
      status: SUCCESS_STATUS,
      data: await this.outputTeamEventTypesResponsePipe.transform(eventTypes),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Get("/teams/event-types")
  @ApiOperation({ summary: "Get all team event types" })
  async getTeamsEventTypes(
    @Param("orgId", ParseIntPipe) orgId: number,
    @Query() queryParams: SkipTakePagination
  ): Promise<GetTeamEventTypesOutput> {
    const { skip, take } = queryParams;
    const eventTypes = await this.organizationsEventTypesService.getTeamsEventTypes(orgId, skip, take);

    return {
      status: SUCCESS_STATUS,
      data: await this.outputTeamEventTypesResponsePipe.transform(eventTypes),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Patch("/teams/:teamId/event-types/:eventTypeId")
  @ApiOperation({ summary: "Update a team event type" })
  async updateTeamEventType(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @GetUser() user: UserWithProfile,
    @Body() bodyEventType: UpdateTeamEventTypeInput_2024_06_14
  ): Promise<UpdateTeamEventTypeOutput> {
    const transformedBody = await this.inputService.transformAndValidateUpdateTeamEventTypeInput(
      user.id,
      eventTypeId,
      teamId,
      bodyEventType
    );

    const eventType = await this.organizationsEventTypesService.updateTeamEventType(
      eventTypeId,
      teamId,
      transformedBody,
      user
    );

    return {
      status: SUCCESS_STATUS,
      data: await this.outputTeamEventTypesResponsePipe.transform(eventType),
    };
  }

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, IsOrgGuard, RolesGuard, IsTeamInOrg, PlatformPlanGuard, IsAdminAPIEnabledGuard)
  @Delete("/teams/:teamId/event-types/:eventTypeId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a team event type" })
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
