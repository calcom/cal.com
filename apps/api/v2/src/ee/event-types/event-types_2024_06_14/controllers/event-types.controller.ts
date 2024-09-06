import type { GetEventTypeById } from "@/ee/event-types/event-types_2024_06_14/event-types.repository";
import { CreateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/create-event-type.output";
import { DeleteEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/delete-event-type.output";
import { GetEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-type.output";
import { GetEventTypesOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-types.output";
import { UpdateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/update-event-type.output";
import { CreateEventTypeTransformPipe } from "@/ee/event-types/event-types_2024_06_14/pipes/create-event-type.transformer";
import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { InputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/input-event-types.service";
import { OutputEventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/output-event-types.service";
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
  UsePipes,
  ParseIntPipe,
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";
import { plainToClass } from "class-transformer";

import { ERROR_STATUS, EVENT_TYPE_READ, EVENT_TYPE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import {
  InputEventTransformed_2024_06_14,
  UpdateEventTypeInput_2024_06_14,
  GetEventTypesQuery_2024_06_14,
  EventTypeOutput_2024_06_14,
} from "@calcom/platform-types";

export type EventTypeResponse = GetEventTypeById & { ownerId: number };
export type HandlerRespose = {
  data: EventTypeResponse;
  status: typeof SUCCESS_STATUS | typeof ERROR_STATUS;
};

@Controller({
  path: "/v2/event-types",
  version: VERSION_2024_06_14_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Event types")
export class EventTypesController_2024_06_14 {
  constructor(
    private readonly eventTypesService: EventTypesService_2024_06_14,
    private readonly inputEventTypesService: InputEventTypesService_2024_06_14,
    private readonly outputEventTypesService: OutputEventTypesService_2024_06_14
  ) {}

  @Post("/")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @UsePipes(CreateEventTypeTransformPipe)
  async createEventType(
    @Body() body: InputEventTransformed_2024_06_14,
    @GetUser() user: UserWithProfile
  ): Promise<CreateEventTypeOutput_2024_06_14> {
    await this.inputEventTypesService.validateEventTypeInputs(
      undefined,
      !!(body.seatsPerTimeSlot && body?.seatsPerTimeSlot > 0),
      body.locations,
      body.requiresConfirmation
    );

    const eventType = await this.eventTypesService.createUserEventType(user, body);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(
        EventTypeOutput_2024_06_14,
        this.outputEventTypesService.getResponseEventType(eventType.ownerId, eventType),
        {
          strategy: "exposeAll",
        }
      ),
    };
  }

  @Get("/:eventTypeId")
  @Permissions([EVENT_TYPE_READ])
  @UseGuards(ApiAuthGuard)
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
      data: plainToClass(
        EventTypeOutput_2024_06_14,
        this.outputEventTypesService.getResponseEventType(eventType.ownerId, eventType),
        {
          strategy: "exposeAll",
        }
      ),
    };
  }

  @Get("/")
  async getEventTypes(
    @Query() queryParams: GetEventTypesQuery_2024_06_14
  ): Promise<GetEventTypesOutput_2024_06_14> {
    const eventTypes = await this.eventTypesService.getEventTypes(queryParams);

    return {
      status: SUCCESS_STATUS,
      data: eventTypes.map((eventType) =>
        plainToClass(
          EventTypeOutput_2024_06_14,
          this.outputEventTypesService.getResponseEventType(eventType.ownerId, eventType),
          {
            strategy: "exposeAll",
          }
        )
      ),
    };
  }

  @Patch("/:eventTypeId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateEventType(
    @Param("eventTypeId", ParseIntPipe) eventTypeId: number,
    @Body() body: UpdateEventTypeInput_2024_06_14,
    @GetUser() user: UserWithProfile
  ): Promise<UpdateEventTypeOutput_2024_06_14> {
    // TODO: determine how to pass eventTypeId to the pipe and utilize the pipe in the controller
    const transformedBody = await this.inputEventTypesService.transformInputUpdateEventType(
      body,
      eventTypeId
    );

    // TODO: determine how to pass these values to the pipe to make the controller cleaner
    await this.inputEventTypesService.validateEventTypeInputs(
      eventTypeId,
      !!(transformedBody?.seatsPerTimeSlot && transformedBody?.seatsPerTimeSlot > 0),
      transformedBody.locations,
      transformedBody.requiresConfirmation
    );

    const eventType = await this.eventTypesService.updateEventType(eventTypeId, transformedBody, user);

    return {
      status: SUCCESS_STATUS,
      data: plainToClass(
        EventTypeOutput_2024_06_14,
        this.outputEventTypesService.getResponseEventType(eventType.ownerId, eventType),
        {
          strategy: "exposeAll",
        }
      ),
    };
  }

  @Delete("/:eventTypeId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(ApiAuthGuard)
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
