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
  }: {
    users: { id: number; email: string }[];
    eventTypeId?: number;
    onlyAccepted?: boolean;
  }) {
    const whereClause = {
      OR: [
        {
          user: {
            id: {
              in: users.map((user) => user.id),
            },
          },
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
        attendees: {
          select: {
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return allBookings;
  }
}
