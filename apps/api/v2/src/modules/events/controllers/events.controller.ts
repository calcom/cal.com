import { GetPublicEventInput } from "@/modules/events/input/get-public-event-input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { Body, Controller, Get, VERSION_NEUTRAL, Version } from "@nestjs/common";

import { getPublicEvent } from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";
import { PrismaClient } from "@calcom/prisma";

@Controller("events")
export class EventsController {
  constructor(private readonly prismaReadService: PrismaReadService) {}

  @Get("/")
  @Version(VERSION_NEUTRAL)
  async getPublicEvent(@Body() input: GetPublicEventInput): Promise<ApiResponse> {
    const event = await getPublicEvent(
      input.username,
      input.eventSlug,
      input.isTeamEvent,
      input.org || null,
      this.prismaReadService.prisma as unknown as PrismaClient
    );

    return {
      data: event,
      status: "success",
    };
  }
}
