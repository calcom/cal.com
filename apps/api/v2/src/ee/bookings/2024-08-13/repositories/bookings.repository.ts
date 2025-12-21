import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";
import { Injectable } from "@nestjs/common";

import type { Prisma } from "@calcom/prisma/client";

@Injectable()
export class BookingsRepository_2024_08_13 {
  constructor(private readonly dbRead: PrismaReadService, private readonly dbWrite: PrismaWriteService) {}

  async getById(id: number) {
    return this.dbRead.prisma.booking.findUnique({
      where: {
        id,
      },
    });
  }

  async getByIdsWithAttendeesAndUserAndEvent(ids: number[]) {
    return this.dbRead.prisma.booking.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        attendees: true,
        user: true,
        eventType: true,
      },
    });
  }

  async getByIdsWithAttendeesWithBookingSeatAndUserAndEvent(ids: number[]) {
    return this.dbRead.prisma.booking.findMany({
      where: {
        id: {
          in: ids,
        },
      },
      include: {
        attendees: {
          include: {
            bookingSeat: true,
          },
        },
        user: true,
        eventType: true,
      },
    });
  }

  async getByUidWithUserIdAndSeatsReferencesCount(bookingUid: string) {
    return this.dbRead.prisma.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        userId: true,
        seatsReferences: {
          take: 1,
        },
      },
    });
  }

  async getByUid(bookingUid: string) {
    return this.dbRead.prisma.booking.findUnique({
      where: {
        uid: bookingUid,
      },
    });
  }

  async getByUidWithEventType(bookingUid: string) {
    return this.dbRead.prisma.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      include: {
        eventType: true,
      },
    });
  }

  async getByUidWithUser(bookingUid: string) {
    return this.dbRead.prisma.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      include: {
        user: true,
      },
    });
  }

  async getByIdWithAttendeesAndUserAndEvent(id: number) {
    return this.dbRead.prisma.booking.findUnique({
      where: {
        id,
      },
      include: {
        attendees: true,
        user: true,
        eventType: true,
      },
    });
  }

  async getByIdWithAttendeesWithBookingSeatAndUserAndEvent(id: number) {
    return this.dbRead.prisma.booking.findUnique({
      where: {
        id,
      },
      include: {
        attendees: {
          include: {
            bookingSeat: true,
          },
        },
        user: true,
        eventType: true,
      },
    });
  }

  async getByUidWithAttendeesAndUserAndEvent(uid: string) {
    const booking = await this.dbRead.prisma.booking.findUnique({
      where: {
        uid,
      },
      include: {
        attendees: true,
        user: true,
        eventType: true,
      },
    });
    if (!booking) {
      return null;
    }

    return {
      ...booking,
      responses: booking.responses as Prisma.JsonObject,
      metadata: booking.metadata as Prisma.JsonObject | null,
    };
  }

  async getByUidWithAttendeesWithBookingSeatAndUserAndEvent(uid: string) {
    return this.dbRead.prisma.booking.findUnique({
      where: {
        uid,
      },
      include: {
        attendees: {
          include: {
            bookingSeat: true,
          },
        },
        user: true,
        eventType: true,
      },
    });
  }

  async getRecurringByUid(uid: string) {
    return this.dbRead.prisma.booking.findMany({
      where: {
        recurringEventId: uid,
      },
    });
  }

  async getRecurringByUidWithAttendeesAndUserAndEvent(uid: string) {
    return this.dbRead.prisma.booking.findMany({
      where: {
        recurringEventId: uid,
      },
      include: {
        attendees: true,
        user: true,
        eventType: true,
      },
    });
  }

  async getByFromReschedule(fromReschedule: string) {
    return this.dbRead.prisma.booking.findFirst({
      where: {
        fromReschedule,
      },
      include: {
        attendees: true,
        user: true,
      },
    });
  }

  async getByUidWithBookingReference(uid: string) {
    return this.dbRead.prisma.booking.findUnique({
      where: {
        uid,
      },
      select: {
        references: true,
      },
    });
  }
}
