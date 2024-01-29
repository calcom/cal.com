import { GetPublicEventInput } from "@/modules/events/inputs/get-public-event.input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Body, Controller, Get, VERSION_NEUTRAL, Version } from "@nestjs/common";

import { EventService } from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";
import type { PrismaClient } from "@calcom/prisma";

@Controller("event")
export class EventsController {
  private eventService: EventService;
  constructor(private readonly dbRead: PrismaReadService) {
    this.eventService = new EventService(this.dbRead.prisma as unknown as PrismaClient);
  }

  @Get("/")
  @Version(VERSION_NEUTRAL)
  async getPublicEvent(@Body() input: GetPublicEventInput): Promise<ApiResponse> {
    const event = await this.eventService.getPublicEvent(
      input.username,
      input.eventSlug,
      input.isTeamEvent,
      input.org
    );

    return {
      status: "success",
      data: event,
    };
  }
}
