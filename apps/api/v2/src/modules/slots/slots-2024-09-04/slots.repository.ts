import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";
import { DateTime } from "luxon";
import { v4 as uuid } from "uuid";

@Injectable()
export class SlotsRepository_2024_09_04 {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getByUid(uid: string) {
    return this.dbRead.prisma.selectedSlots.findFirst({ where: { uid } });
  }

  async getBookingWithAttendeesByEventTypeIdAndStart(eventTypeId: number, startTime: Date) {
    return this.dbRead.prisma.booking.findFirst({
      where: { eventTypeId, startTime },
      select: { attendees: true },
    });
  }

  async createSlot(
    userId: number,
    eventTypeId: number,
    slotUtcStartDate: string,
    slotUtcEndDate: string,
    isSeat: boolean,
    duration: number
  ) {
    const uid = uuid();
    const reservationUntil = DateTime.utc().plus({ minutes: duration }).toISO();

    return this.dbWrite.prisma.selectedSlots.create({
      data: {
        uid,
        userId,
        eventTypeId,
        slotUtcStartDate,
        slotUtcEndDate,
        releaseAt: reservationUntil,
        isSeat,
      },
    });
  }

  async updateSlot(
    eventTypeId: number,
    slotUtcStartDate: string,
    slotUtcEndDate: string,
    id: number,
    duration: number
  ) {
    const reservationUntil = DateTime.utc().plus({ minutes: duration }).toISO();

    return this.dbWrite.prisma.selectedSlots.update({
      where: {
        id,
      },
      data: {
        slotUtcEndDate,
        slotUtcStartDate,
        releaseAt: reservationUntil,
        eventTypeId,
      },
    });
  }

  async deleteSlot(uid: string) {
    // note(Lauris): we have deleteMany because for some reason uid is not unique in the prisma schema
    return this.dbWrite.prisma.selectedSlots.deleteMany({
      where: { uid: { equals: uid } },
    });
  }
}
