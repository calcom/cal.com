import { CreateEventTypeInput } from "@/ee/event-types/inputs/create-event-type.input";
import { EventTypesService } from "@/ee/event-types/services/event-types.service";
import { ForAtom } from "@/lib/atoms/decorators/for-atom.decorator";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { Controller, UseGuards, Get, Param, Post, Body, NotFoundException } from "@nestjs/common";
import { EventType, User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import type { EventType as AtomEventType } from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "event-types",
  version: "2",
})
@UseGuards(AccessTokenGuard)
export class EventTypesController {
  constructor(private readonly eventTypesService: EventTypesService) {}

  @Post("/")
  async createEventType(
    @Body() body: CreateEventTypeInput,
    @GetUser() user: User
  ): Promise<ApiResponse<EventType>> {
    const eventType = await this.eventTypesService.createUserEventType(user.id, body);

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }

  @Get("/:eventTypeId")
  async getEventType(
    @Param("eventTypeId") eventTypeId: string,
    @ForAtom() forAtom: boolean,
    @GetUser() user: User
  ): Promise<ApiResponse<EventType | AtomEventType>> {
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
}
