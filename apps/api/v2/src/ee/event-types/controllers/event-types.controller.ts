import { EventTypesService } from "@/ee/event-types/services/event-types.service";
import { GetUser } from "@/modules/auth/decorators/get-user/get-user.decorator";
import { AccessTokenGuard } from "@/modules/auth/guards/access-token/access-token.guard";
import { Controller, UseGuards, Get, Param } from "@nestjs/common";
import { EventType, User } from "@prisma/client";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { ApiResponse } from "@calcom/platform-types";

@Controller({
  path: "me",
  version: "2",
})
export class EventTypesController {
  constructor(private readonly eventTypesService: EventTypesService) {}

  @Get("/:eventTypeId")
  @UseGuards(AccessTokenGuard)
  async getEventType(
    @Param("eventTypeId") eventTypeId: string,
    @GetUser("id") userId: User["id"]
  ): Promise<ApiResponse> {
    const eventType = await this.eventTypesService.getUserEventType(userId, Number(eventTypeId));

    return {
      status: SUCCESS_STATUS,
      data: eventType,
    };
  }
}

export type EventTypeReturned = Pick<EventType, "id">;
