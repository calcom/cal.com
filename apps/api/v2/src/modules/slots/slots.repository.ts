import { Injectable } from "@nestjs/common";
import { DateTime } from "luxon";

import { MINUTES_TO_BOOK } from "@calcom/platform-libraries";
import { ReserveSlotInput } from "@calcom/platform-types";

@Injectable()
export class SlotsRepository {
  // TODO: PrismaReadService
  async getBookingWithAttendees(bookingUid?: string) {
    // return this.dbRead.prisma.booking.findUnique({
    //   where: { uid: bookingUid },
    //   select: { attendees: true },
    // });
  }
  // TODO: PrismaWriteService
  async upsertSelectedSlot(userId: number, input: ReserveSlotInput, uid: string, isSeat: boolean) {
    // const { slotUtcEndDate, slotUtcStartDate, eventTypeId } = input;
    // const releaseAt = DateTime.utc()
    //   .plus({ minutes: parseInt(MINUTES_TO_BOOK) })
    //   .toISO();
    // return this.dbWrite.prisma.selectedSlots.upsert({
    //   where: {
    //     selectedSlotUnique: { userId, slotUtcStartDate, slotUtcEndDate, uid },
    //   },
    //   update: {
    //     slotUtcEndDate,
    //     slotUtcStartDate,
    //     releaseAt,
    //     eventTypeId,
    //   },
    //   create: {
    //     userId,
    //     eventTypeId,
    //     slotUtcStartDate,
    //     slotUtcEndDate,
    //     uid,
    //     releaseAt,
    //     isSeat,
    //   },
    // });
  }
  // TODO: PrismaWriteService
  async deleteSelectedSlots(uid: string) {
    // return this.dbWrite.prisma.selectedSlots.deleteMany({
    //   where: { uid: { equals: uid } },
    // });
  }
}
