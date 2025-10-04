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

  async getByUid(bookingUid: string) {
    return this.dbRead.prisma.booking.findUnique({
      where: {
        uid: bookingUid,
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
    const booking = await this.dbRead.prisma.booking.findUnique({
      where: {
        id,
      },
      select: {
        id: true,
        uid: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        status: true,
        cancellationReason: true,
        fromReschedule: true,
        eventTypeId: true,
        recurringEventId: true,
        noShowHost: true,
        createdAt: true,
        updatedAt: true,
        rating: true,
        iCalUID: true,
        rescheduled: true,
        rescheduledBy: true,
        metadata: true,
        responses: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
        eventType: true,
        attendees: {
          select: {
            name: true,
            email: true,
            timeZone: true,
            locale: true,
            noShow: true,
            bookingSeat: {
              select: {
                referenceUid: true,
                data: true,
                metadata: true,
              },
            },
          },
        },
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
    const booking = await this.dbRead.prisma.booking.findUnique({
      where: {
        uid,
      },
      select: {
        id: true,
        uid: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        status: true,
        cancellationReason: true,
        fromReschedule: true,
        eventTypeId: true,
        recurringEventId: true,
        noShowHost: true,
        createdAt: true,
        updatedAt: true,
        rating: true,
        iCalUID: true,
        rescheduled: true,
        rescheduledBy: true,
        metadata: true,
        responses: true,
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
          },
        },
        eventType: true,
        attendees: {
          select: {
            name: true,
            email: true,
            timeZone: true,
            locale: true,
            noShow: true,
            bookingSeat: {
              select: {
                referenceUid: true,
                data: true,
                metadata: true,
              },
            },
          },
        },
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
