import { GetPublicEventInput } from "@/modules/events/input/get-public-event-input";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import {
  Body,
  Controller,
  Get,
  VERSION_NEUTRAL,
  Version,
  NotFoundException,
  InternalServerErrorException,
} from "@nestjs/common";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { getPublicEvent } from "@calcom/platform-libraries";
import { ApiResponse } from "@calcom/platform-types";
import { PrismaClient } from "@calcom/prisma";

@Controller("events")
export class EventsController {
  constructor(private readonly prismaReadService: PrismaReadService) {}

  @Get("/")
  @Version(VERSION_NEUTRAL)
  async getPublicEvent(@Body() input: GetPublicEventInput): Promise<ApiResponse> {
    try {
      const event = await getPublicEvent(
        input.username,
        input.eventSlug,
        input.isTeamEvent,
        input.org || null,
        this.prismaReadService.prisma as unknown as PrismaClient
      );
      return {
        data: event,
        status: SUCCESS_STATUS,
      };
    } catch (err) {
      if (err instanceof Error) {
        throw new NotFoundException(err.message);
      }
    }
    throw new InternalServerErrorException("Could not find public event.");
  }
}
