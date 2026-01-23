import { CreateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/create-event-type.output";
import { DeleteEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/delete-event-type.output";
import { GetEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-type.output";
import { GetEventTypesOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-types.output";
import { UpdateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/update-event-type.output";
import { EventTypeResponseTransformPipe } from "@/ee/event-types/event-types_2024_06_14/pipes/event-type-response.transformer";
import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { InputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/input-event-types.service";
import { OutputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
import type { DatabaseEventType } from "@/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
import { VERSION_2024_06_14_VALUE } from "@/lib/api-versions";
import {
  API_KEY_OR_ACCESS_TOKEN_HEADER,
  OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER,
  OPTIONAL_X_CAL_CLIENT_ID_HEADER,
  OPTIONAL_X_CAL_SECRET_KEY_HEADER,
} from "@/lib/docs/headers";
import {
  AuthOptionalUser,
  GetOptionalUser,
} from "@/modules/auth/decorators/get-optional-user/get-optional-user.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { OptionalApiAuthGuard } from "@/modules/auth/guards/optional-api-auth/optional-api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
import { ApiAuthGuardUser } from "@/modules/auth/strategies/api-auth/api-auth.strategy";
import { OutputTeamEventTypesResponsePipe } from "@/modules/organizations/event-types/pipes/team-event-types-response.transformer";
import type { DatabaseTeamEventType } from "@/modules/organizations/event-types/services/output.service";
import { UserWithProfile } from "@/modules/users/users.repository";
import {
  Controller,
  UseGuards,
  Get,
  Param,
  Post,
  Body,
  NotFoundException,
  Patch,
  HttpCode,
  HttpStatus,
  Delete,
  Query,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiHeader, ApiOperation, ApiTags as DocsTags } from "@nestjs/swagger";

import {
  EVENT_TYPE_READ,
  EVENT_TYPE_WRITE,
  SUCCESS_STATUS,
  VERSION_2024_06_14,
} from "@calcom/platform-constants";
import {
  UpdateEventTypeInput_2024_06_14,
  GetEventTypesQuery_2024_06_14,
  CreateEventTypeInput_2024_06_14,
} from "@calcom/platform-types";

@Controller({
  path: "/v2/event-types",
  version: VERSION_2024_06_14_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Event Types")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_06_14}. If not set to this value, the endpoint will default to an older version.`,
  example: VERSION_2024_06_14,
  required: true,
  schema: {
    default: VERSION_2024_06_14,
  },
})
export class EventTypesController_2024_06_14 {
  constructor(
    private readonly eventTypesService: EventTypesService_2024_06_14,
    private readonly inputEventTypesService: InputEventTypesService_2024_06_14,
    private readonly eventTypeResponseTransformPipe: EventTypeResponseTransformPipe,
    private readonly outputEventTypesService: OutputEventTypesService_2024_06_14,
    private readonly outputTeamEventTypesResponsePipe: OutputTeamEventTypesResponsePipe
  ) {}

  @Post("/")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Create an event type",
    description: `<Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>`,
  })
  async createEventType(
    @Body() body: CreateEventTypeInput_2024_06_14,
    @GetUser() user: UserWithProfile
  ): Promise<CreateEventTypeOutput_2024_06_14> {
    const transformedBody = await this.inputEventTypesService.transformAndValidateCreateEventTypeInput(
      user,
      body
    );

    const eventType = await this.eventTypesService.createUserEventType(user, transformedBody);

    return {
      status: SUCCESS_STATUS,
      data: this.eventTypeResponseTransformPipe.transform(eventType),
    };
  }

  @Get("/:eventTypeId")
  @Permissions([EVENT_TYPE_READ])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Get an event type",
    description: `<Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>
    
    Access control: This endpoint fetches an event type by ID and returns it only if the authenticated user is authorized. Authorization is granted to:
    - System admins
    - The event type owner
    - Hosts of the event type or users assigned to the event type
    - Team admins/owners of the team that owns the team event type
    - Organization admins/owners of the event type owner's organization
    - Organization admins/owners of the team's parent organization

    Note: Update and delete endpoints remain restricted to the event type owner only.`,
  })
  async getEventTypeById(
    @Param("eventTypeId") eventTypeId: string,
    @GetUser() user: ApiAuthGuardUser
  ): Promise<GetEventTypeOutput_2024_06_14> {
    const eventType = await this.eventTypesService.getEventTypeByIdIfAuthorized(user, Number(eventTypeId));

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    const responseEventType = this.isTeamEventType(eventType)
      ? await this.outputTeamEventTypesResponsePipe.transform(eventType)
      : this.eventTypeResponseTransformPipe.transform(eventType);

    return {
      status: SUCCESS_STATUS,
      data: responseEventType,
    };
  }

  private isTeamEventType(
    eventType: DatabaseTeamEventType | ({ ownerId: number } & DatabaseEventType)
  ): eventType is DatabaseTeamEventType {
    return !!eventType.teamId;
  }

  @Get("/")
  @ApiOperation({
    summary: "Get all event types",
    description: `Hidden event types are returned only if authentication is provided and it belongs to the event type owner.
      
      Use the optional \`sortCreatedAt\` query parameter to order results by creation date (by ID). Accepts "asc" (oldest first) or "desc" (newest first). When not provided, no explicit ordering is applied.
      
      <Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>
      `,
  })
  @UseGuards(OptionalApiAuthGuard)
  @ApiHeader(OPTIONAL_X_CAL_CLIENT_ID_HEADER)
  @ApiHeader(OPTIONAL_X_CAL_SECRET_KEY_HEADER)
  @ApiHeader(OPTIONAL_API_KEY_OR_ACCESS_TOKEN_HEADER)
  async getEventTypes(
    @Query() queryParams: GetEventTypesQuery_2024_06_14,
    @GetOptionalUser() authUser: AuthOptionalUser
  ): Promise<GetEventTypesOutput_2024_06_14> {
    const eventTypes = await this.eventTypesService.getEventTypes(queryParams, authUser);
    const eventTypesFormatted = this.eventTypeResponseTransformPipe.transform(eventTypes);
    const eventTypesWithoutHiddenFields =
      this.outputEventTypesService.getResponseEventTypesWithoutHiddenFields(eventTypesFormatted);

    return {
      status: SUCCESS_STATUS,
      data: eventTypesWithoutHiddenFields,
    };
  }

  @Patch("/:eventTypeId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: "Update an event type",
    description: `<Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>`,
  })
  async updateEventType(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Body() body: UpdateEventTypeInput_2024_06_14,
    @GetUser() user: UserWithProfile
  ): Promise<UpdateEventTypeOutput_2024_06_14> {
    const transformedBody = await this.inputEventTypesService.transformAndValidateUpdateEventTypeInput(
      body,
      user,
      eventTypeId
    );

    const eventType = await this.eventTypesService.updateEventType(eventTypeId, transformedBody, user);

    return {
      status: SUCCESS_STATUS,
      data: this.eventTypeResponseTransformPipe.transform(eventType),
    };
  }

  @Delete("/:eventTypeId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({
    summary: "Delete an event type",
    description: `<Note>Please make sure to pass in the cal-api-version header value as mentioned in the Headers section. Not passing the correct value will default to an older version of this endpoint.</Note>`,
  })
  async deleteEventType(
    @Param("eventTypeId") eventTypeId: number,
    @GetUser("id") userId: number
  ): Promise<DeleteEventTypeOutput_2024_06_14> {
    const eventType = await this.eventTypesService.deleteEventType(eventTypeId, userId);

    return {
      status: SUCCESS_STATUS,
      data: {
        id: eventType.id,
        lengthInMinutes: eventType.length,
        slug: eventType.slug,
        title: eventType.title,
      },
    };
  }
}
