import { CreatePhoneCallInput } from "@/ee/event-types/event-types_2024_06_14/inputs/create-phone-call.input";
import { CreatePhoneCallOutput } from "@/ee/event-types/event-types_2024_06_14/outputs/create-phone-call.output";
import { API_VERSIONS_VALUES } from "@/lib/api-versions";
import { API_KEY_HEADER } from "@/lib/docs/headers";
import { PlatformPlan } from "@/modules/auth/decorators/billing/platform-plan.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Roles } from "@/modules/auth/decorators/roles/roles.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { RolesGuard } from "@/modules/auth/guards/roles/roles.guard";
import { OutputTeamEventTypesResponsePipe } from "@/modules/organizations/event-types/pipes/team-event-types-response.transformer";
import { InputOrganizationsEventTypesService } from "@/modules/organizations/event-types/services/input.service";
import { DatabaseTeamEventType } from "@/modules/organizations/event-types/services/output.service";
import { CreateTeamEventTypeOutput } from "@/modules/teams/event-types/outputs/create-team-event-type.output";
import { DeleteTeamEventTypeOutput } from "@/modules/teams/event-types/outputs/delete-team-event-type.output";
import { GetTeamEventTypeOutput } from "@/modules/teams/event-types/outputs/get-team-event-type.output";
import { GetTeamEventTypesOutput } from "@/modules/teams/event-types/outputs/get-team-event-types.output";
import { UpdateTeamEventTypeOutput } from "@/modules/teams/event-types/outputs/update-team-event-type.output";
import { TeamsEventTypesService } from "@/modules/teams/event-types/services/teams-event-types.service";
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
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

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
  path: "/v2/teams/:teamId/event-types",
  version: API_VERSIONS_VALUES,
})
@DocsTags("Teams / Event Types")
export class TeamsEventTypesController {
  constructor(
    private readonly teamsEventTypesService: TeamsEventTypesService,
    private readonly inputService: InputOrganizationsEventTypesService,
    private readonly outputTeamEventTypesResponsePipe: OutputTeamEventTypesResponsePipe
  ) {}

  @Roles("TEAM_ADMIN")
  @PlatformPlan("ESSENTIALS")
  @UseGuards(ApiAuthGuard, RolesGuard)
  @ApiHeader(API_KEY_HEADER)
  @Post("/")
  @ApiOperation({ summary: "Create an event type" })
  async createTeamEventType(
    @GetUser() user: UserWithProfile,
    @Param("teamId", ParseIntPipe) teamId: number,
    @Body() bodyEventType: CreateTeamEventTypeInput_2024_06_14
  ): Promise<CreateTeamEventTypeOutput> {
    const transformedBody = await this.inputService.transformAndValidateCreateTeamEventTypeInput(
      user.id,
      teamId,
      bodyEventType
    );

    const eventType = await this.teamsEventTypesService.createTeamEventType(user, teamId, transformedBody);

    return {
      status: SUCCESS_STATUS,
      data: await this.outputTeamEventTypesResponsePipe.transform(eventType),
    };
  }

  @Roles("TEAM_ADMIN")
  @UseGuards(ApiAuthGuard, RolesGuard)
  @ApiHeader(API_KEY_HEADER)
  @Get("/:eventTypeId")
  @ApiOperation({ summary: "Get an event type" })
  async getTeamEventType(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("eventTypeId") eventTypeId: number
  ): Promise<GetTeamEventTypeOutput> {
    const eventType = await this.teamsEventTypesService.getTeamEventType(teamId, eventTypeId);

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
  @Post("/:eventTypeId/create-phone-call")
  @UseGuards(ApiAuthGuard, RolesGuard)
  @ApiHeader(API_KEY_HEADER)
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

  @Get("/")
  @ApiOperation({
    summary: "Get team event types",
    description:
      'Use the optional `sortCreatedAt` query parameter to order results by creation date (by ID). Accepts "asc" (oldest first) or "desc" (newest first). When not provided, no explicit ordering is applied.',
  })
  async getTeamEventTypes(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Query() queryParams: GetTeamEventTypesQuery_2024_06_14
  ): Promise<GetTeamEventTypesOutput> {
    const { eventSlug, hostsLimit, sortCreatedAt } = queryParams;

    if (eventSlug) {
      const eventType = await this.teamsEventTypesService.getTeamEventTypeBySlug(
        teamId,
        eventSlug,
        hostsLimit
      );

      return {
        status: SUCCESS_STATUS,
        data: await this.outputTeamEventTypesResponsePipe.transform(eventType ? [eventType] : []),
      };
    }

    const eventTypes = await this.teamsEventTypesService.getTeamEventTypes(teamId, sortCreatedAt);

    return {
      status: SUCCESS_STATUS,
      data: await this.outputTeamEventTypesResponsePipe.transform(eventTypes),
    };
  }

  @Roles("TEAM_ADMIN")
  @UseGuards(ApiAuthGuard, RolesGuard)
  @ApiHeader(API_KEY_HEADER)
  @Patch("/:eventTypeId")
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

    const eventType = await this.teamsEventTypesService.updateTeamEventType(
      eventTypeId,
      teamId,
      transformedBody,
      user,
      false
    );

    return {
      status: SUCCESS_STATUS,
      data: await this.outputTeamEventTypesResponsePipe.transform(eventType),
    };
  }

  @Roles("TEAM_ADMIN")
  @UseGuards(ApiAuthGuard, RolesGuard)
  @ApiHeader(API_KEY_HEADER)
  @Delete("/:eventTypeId")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Delete a team event type" })
  async deleteTeamEventType(
    @Param("teamId", ParseIntPipe) teamId: number,
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number
  ): Promise<DeleteTeamEventTypeOutput> {
    const eventType = await this.teamsEventTypesService.deleteTeamEventType(teamId, eventTypeId);

    return {
      status: SUCCESS_STATUS,
      data: {
        id: eventTypeId,
        title: eventType.title,
      },
    };
  }
}
