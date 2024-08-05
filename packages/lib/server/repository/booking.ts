import type { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

export class BookingRepository {
  static async findFirstBookingByReschedule({ originalBookingUid }: { originalBookingUid: string }) {
    return await prisma.booking.findFirst({
      where: {
        fromReschedule: originalBookingUid,
      },
      select: {
        uid: true,
      },
    });
  }

  static async getAllBookingsOfUsers({
    users,
    eventTypeId,
    onlyAccepted = false,
    withoutNoShows = false,
  }: {
    users: { id: number; email: string }[];
    eventTypeId?: number;
    onlyAccepted?: boolean;
    withoutNoShows?: boolean;
  }) {
    const whereClause: Prisma.BookingWhereInput = {
      OR: [
        {
          user: {
            id: {
              in: users.map((user) => user.id),
            },
          },
          ...(withoutNoShows && { OR: [{ noShowHost: false }, { noShowHost: null }] }),
        },
        {
          attendees: {
            some: {
              email: {
                in: users.map((user) => user.email),
              },
            },
          },
        },
      ],
      ...(withoutNoShows && { attendees: { some: { noShow: false } } }),
    };

    if (eventTypeId !== undefined) {
      whereClause.eventTypeId = eventTypeId;
    }

    if (onlyAccepted) {
      whereClause.status = BookingStatus.ACCEPTED;
    }

    const allBookings = await prisma.booking.findMany({
      where: whereClause,
      select: {
        id: true,
        attendees: true,
        userId: true,
        createdAt: true,
        status: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return allBookings;
  }
}
