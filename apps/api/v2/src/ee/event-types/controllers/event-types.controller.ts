import { EventTypesRepository } from "@/ee/event-types/event-types.repository";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { Controller, UseGuards, Get, Param } from "@nestjs/common";
import { EventType, User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "event-types",
  version: "2",
})
@UseGuards(AccessTokenGuard)
export class EventTypesController {
  constructor(private readonly eventTypesRepository: EventTypesRepository) {}

  @Get("/:eventTypeId")
  async getEventType(
    @Param("eventTypeId") eventTypeId: string,
    @GetUser("id") userId: User["id"]
  ): Promise<ApiResponse> {
    const eventType = await this.eventTypesRepository.getUserEventType(userId, Number(eventTypeId));

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }
}

export type EventTypeReturned = Pick<EventType, "id">;
