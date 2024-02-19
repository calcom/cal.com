import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import {
  Controller,
  Get,
  VERSION_NEUTRAL,
  Version,
  NotFoundException,
  InternalServerErrorException,
  Query,
} from "@nestjs/common";

import { SUCCESS_STATUS } from "@calcom/platform-constants";
import { getPublicEvent } from "@calcom/platform-libraries";
import { ApiResponse, GetPublicEventInput } from "@calcom/platform-types";
import { PrismaClient } from "@calcom/prisma";

@Controller("events")
export class EventsController {
  constructor(private readonly prismaReadService: PrismaReadService) {}

  @Get("/")
  @Version(VERSION_NEUTRAL)
  async getPublicEvent(
    @Query() queryParams: GetPublicEventInput
  ): Promise<ApiResponse<Awaited<ReturnType<typeof getPublicEvent>>>> {
    try {
      const event = await getPublicEvent(
        queryParams.username,
        queryParams.eventSlug,
        queryParams.isTeamEvent,
        queryParams.org || null,
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
