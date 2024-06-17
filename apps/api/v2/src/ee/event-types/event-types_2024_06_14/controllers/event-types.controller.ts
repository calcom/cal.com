import { CreateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/create-event-type.output";
import { DeleteEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/delete-event-type.output";
import { GetEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-type.output";
import { GetEventTypesOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/get-event-types.output";
import { UpdateEventTypeOutput_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/outputs/update-event-type.output";
import { EventTypesService_2024_06_14 } from "@/ee/event-types/event-types_2024_06_14/services/event-types.service";
import { VERSION_2024_06_14_VALUE } from "@/lib/api-versions";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { Permissions } from "@/modules/auth/decorators/permissions/permissions.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
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
} from "@nestjs/common";
import { ApiTags as DocsTags } from "@nestjs/swagger";

import { EVENT_TYPE_READ, EVENT_TYPE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import { CreateEventTypeInput_2024_06_14, UpdateEventTypeInput_2024_06_14 } from "@calcom/platform-types";

@Controller({
  path: "/v2/event-types",
  version: VERSION_2024_06_14_VALUE,
})
@UseGuards(PermissionsGuard)
@DocsTags("Event types")
export class EventTypesController_2024_06_14 {
  constructor(private readonly eventTypesService: EventTypesService_2024_06_14) {}

  @Post("/")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(AccessTokenGuard)
  async createEventType(
    @Body() body: CreateEventTypeInput_2024_06_14,
    @GetUser() user: UserWithProfile
  ): Promise<CreateEventTypeOutput_2024_06_14> {
    const eventType = await this.eventTypesService.createUserEventType(user, body);

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Get("/:eventTypeId")
  @Permissions([EVENT_TYPE_READ])
  @UseGuards(AccessTokenGuard)
  async getEventType(
    @Param("eventTypeId") eventTypeId: string,
    @GetUser() user: UserWithProfile
  ): Promise<GetEventTypeOutput_2024_06_14> {
    const eventType = await this.eventTypesService.getUserEventType(user.id, Number(eventTypeId));

    if (!eventType) {
      throw new NotFoundException(`Event type with id ${eventTypeId} not found`);
    }

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Get("/")
  @Permissions([EVENT_TYPE_READ])
  @UseGuards(AccessTokenGuard)
  async getEventTypes(@GetUser() user: UserWithProfile): Promise<GetEventTypesOutput_2024_06_14> {
    const eventTypes = await this.eventTypesService.getUserEventTypes(user.id);

    return {
      status: SUCCESS_STATUS,
      data: eventTypes,
    };
  }

  @Patch("/:eventTypeId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(AccessTokenGuard)
  @HttpCode(HttpStatus.OK)
  async updateEventType(
    @Param("eventTypeId") eventTypeId: number,
    @Body() body: UpdateEventTypeInput_2024_06_14,
    @GetUser() user: UserWithProfile
  ): Promise<UpdateEventTypeOutput_2024_06_14> {
    const eventType = await this.eventTypesService.updateEventType(eventTypeId, body, user);

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Delete("/:eventTypeId")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(AccessTokenGuard)
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
