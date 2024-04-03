import { CreateEventTypeInput } from "@/ee/event-types/inputs/create-event-type.input";
import { UpdateEventTypeInput } from "@/ee/event-types/inputs/update-event-type.input";
import { CreateEventTypeOutput } from "@/ee/event-types/outputs/create-event-type.output";
import { EventTypesService } from "@/ee/event-types/services/event-types.service";
import { ForAtom } from "@/lib/atoms/decorators/for-atom.decorator";
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
import { EventType } from "@prisma/client";

import { EventTypesByViewer } from "@calcom/lib";
import { EVENT_TYPE_READ, EVENT_TYPE_WRITE, SUCCESS_STATUS } from "@calcom/platform-constants";
import type {
  EventType as AtomEventType,
  EventTypesPublic,
  UpdateEventTypeReturn,
} from "@calcom/platform-libraries";
import { getEventTypesByViewer } from "@calcom/platform-libraries";
import { ApiResponse, ApiSuccessResponse } from "@calcom/platform-types";

@Controller({
  path: "event-types",
  version: "2",
})
@UseGuards(PermissionsGuard)
@DocsTags("Event types")
export class EventTypesController {
  constructor(private readonly eventTypesService: EventTypesService) {}

  @Post("/")
  @Permissions([EVENT_TYPE_WRITE])
  @UseGuards(AccessTokenGuard)
  async createEventType(
    @Body() body: CreateEventTypeInput,
    @GetUser() user: UserWithProfile
  ): Promise<CreateEventTypeOutput> {
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
    @ForAtom() forAtom: boolean,
    @GetUser() user: UserWithProfile
  ): Promise<ApiSuccessResponse<EventType | AtomEventType>> {
    const eventType = forAtom
      ? await this.eventTypesService.getUserEventTypeForAtom(user, Number(eventTypeId))
      : await this.eventTypesService.getUserEventType(user.id, Number(eventTypeId));

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
  async getEventTypes(@GetUser() user: UserWithProfile): Promise<ApiSuccessResponse<EventTypesByViewer>> {
    const eventTypes = await getEventTypesByViewer({
      id: user.id,
      profile: {
        upId: `usr-${user.id}`,
      },
    });

    return {
      status: SUCCESS_STATUS,
      data: eventTypes,
    };
  }

  @Get("/:username/public")
  @Permissions([EVENT_TYPE_READ])
  async getPublicEventTypes(
    @Param("username") username: string
  ): Promise<ApiSuccessResponse<EventTypesPublic>> {
    const eventTypes = await this.eventTypesService.getEventTypesPublicByUsername(username);

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
    @Body() body: UpdateEventTypeInput,
    @GetUser() user: UserWithProfile
  ): Promise<ApiResponse<UpdateEventTypeReturn["eventType"]>> {
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
  ): Promise<ApiResponse<EventType>> {
    const eventType = await this.eventTypesService.deleteEventType(eventTypeId, userId);

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }
}
