import { CreateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/create-event-type.output";
import { DeleteEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/delete-event-type.output";
import { GetEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-type.output";
import { GetEventTypesOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-types.output";
import { UpdateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/update-event-type.output";
import { EventTypeResponseTransformPipe } from "@/ee/event-types/event-types_2024_06_14/pipes/event-type-response.transformer";
import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { InputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/input-event-types.service";
import { VERSION_2024_06_14_VALUE } from "@/lib/api-versions";
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

import { EVENT_TYPE_READ, EVENT_TYPE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
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
  description: `Must be set to \`2024-06-14\``,
  required: true,
})
export class EventTypesController_2024_06_14 {
  constructor(
    private readonly eventTypesService: EventTypesService_2024_06_14,
    private readonly inputEventTypesService: InputEventTypesService_2024_06_14,
    private readonly eventTypeResponseTransformPipe: EventTypeResponseTransformPipe
  ) {}

  @Post("/")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader({
    name: "Authorization",
    description:
      "value must be `Bearer <token>` where `<token>` either managed user access token or api key prefixed with cal_",
    required: true,
  })
  @ApiOperation({ summary: "Create an event type" })
  async createEventType(
    @Body() body: CreateEventTypeInput_2024_06_14,
    @GetUser() user: UserWithProfile
  ): Promise<CreateEventTypeOutput_2024_06_14> {
    const transformedBody = await this.inputEventTypesService.transformAndValidateCreateEventTypeInput(
      user.id,
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
  @ApiHeader({
    name: "Authorization",
    description:
      "value must be `Bearer <token>` where `<token>` either managed user access token or api key prefixed with cal_",
    required: true,
  })
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

    return {
      status: SUCCESS_STATUS,
      data: this.eventTypeResponseTransformPipe.transform(eventTypes),
    };
  }

  @Patch("/:eventTypeId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @ApiHeader({
    name: "Authorization",
    description:
      "value must be `Bearer <token>` where `<token>` either managed user access token or api key prefixed with cal_",
    required: true,
  })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Update an event type" })
  async updateEventType(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Body() body: UpdateEventTypeInput_2024_06_14,
    @GetUser() user: UserWithProfile
  ): Promise<UpdateEventTypeOutput_2024_06_14> {
    const transformedBody = await this.inputEventTypesService.transformAndValidateUpdateEventTypeInput(
      body,
      user.id,
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
  @ApiHeader({
    name: "Authorization",
    description:
      "value must be `Bearer <token>` where `<token>` either managed user access token or api key prefixed with cal_",
    required: true,
  })
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
}
