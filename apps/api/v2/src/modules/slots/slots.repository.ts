import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { DateTime } from "luxon";

import { MINUTES_TO_BOOK } from "@calcom/platform-libraries-0.0.2";
import { ReserveSlotInput } from "@calcom/platform-types";

@Injectable()
export class SlotsRepository {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getBookingWithAttendees(bookingUid?: string) {
    return this.dbRead.prisma.booking.findUnique({
      where: { uid: bookingUid },
      select: { attendees: true },
    });
  }

  async upsertSelectedSlot(userId: number, input: ReserveSlotInput, uid: string, isSeat: boolean) {
    const { slotUtcEndDate, slotUtcStartDate, eventTypeId } = input;

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
