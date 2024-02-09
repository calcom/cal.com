import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { ReserveSlotInput } from "@/modules/slots/inputs/reserve-slot.input";
import { DateTime } from "luxon";

import { MINUTES_TO_BOOK } from "@calcom/lib/constants";

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
}
