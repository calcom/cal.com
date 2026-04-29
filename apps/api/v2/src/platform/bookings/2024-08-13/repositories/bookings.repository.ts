import { bookingWithUserAndEventDetailsSelect } from "@calcom/platform-libraries/bookings";
import type { Prisma } from "@calcom/prisma/client";
import { Injectable } from "@nestjs/common";
import { PrismaReadService } from "@/modules/prisma/prisma-read.service";
import { PrismaWriteService } from "@/modules/prisma/prisma-write.service";

export type BookingSearchFilters_2024_08_13 = {
  email?: string;
  eventType?: string;
  status?: string;
  from?: string;
  to?: string;
};

export type BookingSearchRow_2024_08_13 = {
  id: number;
  uid: string;
  title: string;
  status: string;
  startTime: Date;
  endTime: Date;
  createdAt: Date;
  eventTypeId: number | null;
  eventTypeSlug: string | null;
  eventTypeTitle: string | null;
  attendeeEmails: string[];
};

@Injectable()
export class BookingsRepository_2024_08_13 {
  constructor(
    private readonly dbRead: PrismaReadService,
    private readonly dbWrite: PrismaWriteService
  ) {}

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

  async getByUidWithAttendees(uid: string) {
    return this.dbRead.prisma.booking.findUnique({
      where: {
        uid,
      },
      select: {
        id: true,
        attendees: {
          select: {
            id: true,
            name: true,
            email: true,
            timeZone: true,
          },
        },
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

  async getBookingByUidWithUserAndEventDetails(uid: string) {
    return this.dbRead.prisma.booking.findUnique({
      where: { uid },
      select: bookingWithUserAndEventDetailsSelect,
    });
  }

  async getBookingByIdWithUserAndEventDetails(id: number) {
    return this.dbRead.prisma.booking.findUnique({
      where: { id },
      select: bookingWithUserAndEventDetailsSelect,
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

  async searchBookingsRaw(
    userId: number,
    filters: BookingSearchFilters_2024_08_13
  ): Promise<BookingSearchRow_2024_08_13[]> {
    const conditions: string[] = [];
    const values: (string | number | Date)[] = [];

    const addCondition = (condition: string, ...conditionValues: (string | number | Date)[]) => {
      let queryCondition = condition;
      for (const conditionValue of conditionValues) {
        values.push(conditionValue);
        queryCondition = queryCondition.replace("?", `$${values.length}`);
      }
      conditions.push(queryCondition);
    };

    addCondition(`b."userId" = ?`, userId);

    if (filters.email) {
      addCondition(
        `EXISTS (
          SELECT 1
          FROM "Attendee" a2
          WHERE a2."bookingId" = b.id
            AND a2.email ILIKE ?
        )`,
        `%${filters.email}%`
      );
    }

    if (filters.status) {
      addCondition(`b.status = ?`, filters.status);
    }

    if (filters.from) {
      addCondition(`b."startTime" >= ?`, new Date(filters.from));
    }

    if (filters.to) {
      addCondition(`b."startTime" <= ?`, new Date(filters.to));
    }

    if (filters.eventType) {
      const eventTypeAsNumber = Number(filters.eventType);
      const isIntegerEventType = Number.isInteger(eventTypeAsNumber) && `${eventTypeAsNumber}` === filters.eventType;

      if (isIntegerEventType) {
        addCondition(`et.id = ?`, eventTypeAsNumber);
      } else {
        const eventTypeLikeFilter = `%${filters.eventType}%`;
        addCondition(`(et.slug ILIKE ? OR et.title ILIKE ?)`, eventTypeLikeFilter, eventTypeLikeFilter);
      }
    }

    const query = `
      SELECT
        b.id,
        b.uid,
        b.title,
        b.status,
        b."startTime",
        b."endTime",
        b."createdAt",
        et.id AS "eventTypeId",
        et.slug AS "eventTypeSlug",
        et.title AS "eventTypeTitle",
        ARRAY_REMOVE(ARRAY_AGG(DISTINCT a.email), NULL) AS "attendeeEmails"
      FROM "Booking" b
      LEFT JOIN "EventType" et ON et.id = b."eventTypeId"
      LEFT JOIN "Attendee" a ON a."bookingId" = b.id
      WHERE ${conditions.join(" AND ")}
      GROUP BY b.id, et.id
      ORDER BY b."startTime" DESC
    `;

    return this.dbRead.prisma.$queryRawUnsafe<BookingSearchRow_2024_08_13[]>(query, ...values);
  }

  async updateBooking(bookingUid: string, body: Prisma.BookingUpdateInput) {
    return this.dbWrite.prisma.booking.update({
      where: {
        uid: bookingUid,
      },
      data: body,
      select: { uid: true },
    });
  }
}
