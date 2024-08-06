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

  static async getAllBookingsForRoundRobin({
    users,
    eventTypeId,
  }: {
    users: { id: number; email: string }[];
    eventTypeId: number;
  }) {
    const whereClause: Prisma.BookingWhereInput = {
      OR: [
        {
          user: {
            id: {
              in: users.map((user) => user.id),
            },
          },
          OR: [
            {
              noShowHost: false,
            },
            {
              noShowHost: null,
            },
          ],
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
      attendees: { some: { noShow: false } },
      status: BookingStatus.ACCEPTED,
      eventTypeId,
    };

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
