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

  static async getAllAcceptedBookingsOfUsers({
    users,
    eventTypeId,
  }: {
    users: { id: number; email: string };
    eventTypeId?: number;
  }) {
    const whereClause = {
      status: BookingStatus.ACCEPTED,
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

    const allBookings = await prisma.booking.findMany({
      where: whereClause,
      select: {
        attendees: true,
        userId: true,
      },
    });

    return allBookings;
  }
}
