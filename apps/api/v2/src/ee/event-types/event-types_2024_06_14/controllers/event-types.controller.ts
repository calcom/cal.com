import { CreateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/create-event-type.output";
import { DeleteEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/delete-event-type.output";
import { GetEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-type.output";
import { GetEventTypesOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-types.output";
import { UpdateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/update-event-type.output";
import { EventTypeResponseTransformPipe } from "@/ee/event-types/event-types_2024_06_14/pipes/event-type-response.transformer";
import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { InputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/input-event-types.service";
import { PrivateLinksService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/private-links.service";
import { VERSION_2024_06_14_VALUE } from "@/lib/api-versions";
import { API_KEY_OR_ACCESS_TOKEN_HEADER } from "@/lib/docs/headers";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { ApiAuthGuard } from "@/modules/auth/guards/api-auth/api-auth.guard";
import { PermissionsGuard } from "@/modules/auth/guards/permissions/permissions.guard";
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
  EventTypeOutput_2024_06_14,
  CreatePrivateLinkInput_2024_06_14,
  UpdatePrivateLinkInput_2024_06_14,
  CreatePrivateLinkOutput_2024_06_14,
  GetPrivateLinksOutput_2024_06_14,
  UpdatePrivateLinkOutput_2024_06_14,
  DeletePrivateLinkOutput_2024_06_14,
} from "@calcom/platform-types";

@Controller({
  path: "/v2/event-types",
  version: VERSION_2024_06_14_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Event Types")
@ApiHeader({
  name: "cal-api-version",
  description: `Must be set to ${VERSION_2024_06_14}`,
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
    private readonly privateLinksService: PrivateLinksService_2024_06_14
  ) {}

  @Post("/")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Create an event type" })
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
  @ApiOperation({ summary: "Get an event type" })
  async getEventTypeById(
    @Param("eventTypeId") eventTypeId: string,
    @GetUser() user: UserWithProfile
  ): Promise<GetEventTypeOutput_2024_06_14> {
    const eventType = await this.eventTypesService.getUserEventType(user.id, Number(eventTypeId));

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return {
      status: SUCCESS_STATUS,
      data: this.eventTypeResponseTransformPipe.transform(eventType),
    };
  }

  @Get("/")
  @ApiOperation({ summary: "Get all event types" })
  async getEventTypes(
    @Query() queryParams: GetEventTypesQuery_2024_06_14
  ): Promise<GetEventTypesOutput_2024_06_14> {
    const eventTypes = await this.eventTypesService.getEventTypes(queryParams);
    if (!eventTypes || eventTypes.length === 0) {
      throw new NotFoundException(`Event types not found`);
    }
    const eventTypesFormatted = this.eventTypeResponseTransformPipe.transform(eventTypes);
    const eventTypesWithoutHiddenFields = eventTypesFormatted.map((eventType) => {
      return {
        ...eventType,
        bookingFields: Array.isArray(eventType?.bookingFields)
          ? eventType?.bookingFields
              .map((field) => {
                if ("hidden" in field) {
                  return field.hidden !== true ? field : null;
                }
                return field;
              })
              .filter((f) => f)
          : [],
      };
    }) as EventTypeOutput_2024_06_14[];

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
  @ApiOperation({ summary: "Update an event type" })
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
  @ApiOperation({ summary: "Delete an event type" })
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

  // Private Links Endpoints

  @Post("/:eventTypeId/private-links")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Create a private link for an event type" })
  async createPrivateLink(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Body() body: CreatePrivateLinkInput_2024_06_14,
    @GetUser("id") userId: number
  ): Promise<CreatePrivateLinkOutput_2024_06_14> {
    const privateLink = await this.privateLinksService.createPrivateLink(eventTypeId, userId, body);

    return {
      status: SUCCESS_STATUS,
      data: privateLink,
    };
  }

  @Get("/:eventTypeId/private-links")
  @Permissions([EVENT_TYPE_READ])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Get all private links for an event type" })
  async getPrivateLinks(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @GetUser("id") userId: number
  ): Promise<GetPrivateLinksOutput_2024_06_14> {
    const privateLinks = await this.privateLinksService.getPrivateLinks(eventTypeId, userId);

    return {
      status: SUCCESS_STATUS,
      data: privateLinks,
    };
  }

  @Patch("/:eventTypeId/private-links/:linkId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Update a private link for an event type" })
  async updatePrivateLink(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("linkId") linkId: string,
    @Body() body: Omit<UpdatePrivateLinkInput_2024_06_14, "linkId">,
    @GetUser("id") userId: number
  ): Promise<UpdatePrivateLinkOutput_2024_06_14> {
    const updateInput = { ...body, linkId };
    const privateLink = await this.privateLinksService.updatePrivateLink(eventTypeId, userId, updateInput);

    return {
      status: SUCCESS_STATUS,
      data: privateLink,
    };
  }

  @Delete("/:eventTypeId/private-links/:linkId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader(API_KEY_OR_ACCESS_TOKEN_HEADER)
  @ApiOperation({ summary: "Delete a private link for an event type" })
  async deletePrivateLink(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Param("linkId") linkId: string,
    @GetUser("id") userId: number
  ): Promise<DeletePrivateLinkOutput_2024_06_14> {
    await this.privateLinksService.deletePrivateLink(eventTypeId, userId, linkId);

    return {
      status: SUCCESS_STATUS,
      data: {
        linkId,
        message: "Private link deleted successfully",
      },
    };
  }
}
