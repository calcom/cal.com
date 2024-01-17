import { GetPublicEventInput } from "@/modules/events/inputs/get-public-event.input";
import { Body, Controller, Get, VERSION_NEUTRAL, Version } from "@nestjs/common";

import { EventService } from "@calcom/features/eventtypes/lib/event-service";
import { ApiResponse } from "@calcom/platform-types";

@Controller("event")
export class EventsController {
  constructor(private readonly eventsService: EventService) {}

  @Get("/")
  @Version(VERSION_NEUTRAL)
  async getPublicEvent(@Body() input: GetPublicEventInput): Promise<ApiResponse> {
    const event = await this.eventsService.getPublicEvent(
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
