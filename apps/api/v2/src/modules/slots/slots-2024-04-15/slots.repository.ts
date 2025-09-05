import { MINUTES_TO_BOOK } from "@calcom/platform-libraries";
import { ReserveSlotInput_2024_04_15 } from "@calcom/platform-types";
import { Injectable } from "@nestjs/common";
import { DateTime } from "luxon";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

@Injectable()
export class SlotsRepository_2024_04_15 {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

  async getBookingWithAttendees(bookingUid?: string) {
    return this.dbRead.prisma.booking.findUnique({
      where: { uid: bookingUid },
      select: { attendees: true },
    });
  }

  async upsertSelectedSlot(userId: number, input: ReserveSlotInput_2024_04_15, uid: string, isSeat: boolean) {
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
