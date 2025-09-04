import { slotsQuerySchema, slotsResponseSchema } from "@/schema/slots.schema";
import { NotFoundError } from "@/utils/error";
import { z } from "zod";

import { getAvailableSlotsService } from "@calcom/lib/di/containers/available-slots";
import { AvailableSlotsService } from "@calcom/platform-libraries/slots";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma, User, UserPermissionRole } from "@calcom/prisma/client";

import { BaseRepository } from "./base.repository";

export class SlotsRepository extends BaseRepository<User> {
  private availableSlotsService: AvailableSlotsService;

  constructor(prisma: PrismaClient) {
    super(prisma);
    this.availableSlotsService = getAvailableSlotsService();
  }

  async getAvailableSlots(query: z.infer<typeof slotsQuerySchema>) {
    const data = this.availableSlotsService.getAvailableSlots({
      input: {
        eventTypeId: query.eventTypeId ? Number.parseInt(query.eventTypeId) : undefined,
        eventTypeSlug: query.eventTypeSlug,
        startTime: query.start,
        endTime: query.end,
        timeZone: query.timeZone,
        // duration: query.duration,
        isTeamEvent: false,
      },
    });
    return data;
  }
}
