import { slotsQuerySchema } from "@/schema/slots.schema";
import { z } from "zod";

import { getAvailableSlotsService } from "@calcom/lib/di/containers/available-slots";
import { AvailableSlotsService } from "@calcom/platform-libraries/slots";
import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { randomUUID } from "crypto";

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

  async getEventTypeWithHosts(eventTypeId: number) {
    return this.prisma.eventType.findUnique({
      where: { id: eventTypeId },
      include: { hosts: true },
    });
  }

  async findActiveOverlappingBooking(eventTypeId: number, slotStartTime: Date, slotEndTime: Date) {
    return this.prisma.booking.findFirst({
      where: {
        eventTypeId,
        startTime: { lt: slotEndTime },
        endTime: { gt: slotStartTime },
        status: { in: ["ACCEPTED", "PENDING", "AWAITING_HOST"] as any },
      },
      select: { attendees: true, status: true },
    });
  }

  async getOverlappingSlotReservation(eventTypeId: number, startISO: string, endISO: string, now: Date) {
    return this.prisma.selectedSlots.findFirst({
      where: {
        eventTypeId,
        AND: [
          {
            OR: [
              { slotUtcStartDate: { lte: startISO }, slotUtcEndDate: { gt: startISO } },
              { slotUtcStartDate: { lt: endISO }, slotUtcEndDate: { gte: endISO } },
              { slotUtcStartDate: { lte: startISO }, slotUtcEndDate: { gte: endISO } },
              { slotUtcStartDate: { gte: startISO }, slotUtcEndDate: { lte: endISO } },
            ],
          },
          { releaseAt: { gt: now } },
        ],
      },
    });
  }

  async createSelectedSlot(
    userId: number,
    eventTypeId: number,
    slotUtcStartDate: string,
    slotUtcEndDate: string,
    isSeat: boolean,
    releaseAtISO: string
  ) {
    return this.prisma.selectedSlots.create({
      data: {
        uid: randomUUID(),
        userId,
        eventTypeId,
        slotUtcStartDate,
        slotUtcEndDate,
        releaseAt: releaseAtISO,
        isSeat,
      },
    });
  }
}
