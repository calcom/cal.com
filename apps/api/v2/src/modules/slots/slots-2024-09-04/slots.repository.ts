import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { DateTime } from "luxon";

import { MINUTES_TO_BOOK } from "@calcom/platform-libraries";

@Injectable()
export class SlotsRepository_2024_09_04 {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getBookingWithAttendeesByEventTypeIdAndStart(eventTypeId: number, startTime: Date) {
    return this.dbRead.prisma.booking.findFirst({
      where: { eventTypeId, startTime },
      select: { attendees: true },
    });
  }

  async upsertSelectedSlot(
    userId: number,
    eventTypeId: number,
    slotUtcStartDate: string,
    slotUtcEndDate: string,
    uid: string,
    isSeat: boolean
  ) {
    const releaseAt = DateTime.utc()
      .plus({ minutes: parseInt(MINUTES_TO_BOOK) })
      .toISO();
    return this.dbWrite.prisma.selectedSlots.upsert({
      where: {
        selectedSlotUnique: { userId, slotUtcStartDate, slotUtcEndDate, uid },
      },
      update: {
        slotUtcEndDate,
        slotUtcStartDate,
        releaseAt,
        eventTypeId,
      },
      create: {
        userId,
        eventTypeId,
        slotUtcStartDate,
        slotUtcEndDate,
        uid,
        releaseAt,
        isSeat,
      },
    });
  }

  async deleteSelectedSlots(uid: string) {
    return this.dbWrite.prisma.selectedSlots.deleteMany({
      where: { uid: { equals: uid } },
    });
  }
}
