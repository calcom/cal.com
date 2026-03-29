import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

export class BookingRepository {
  constructor(private prisma: Omit<PrismaClient, "booking">) {}

  async findAcceptedBookingsByUserIdsOrEmails(
    userIds: number[],
    userEmails: string[],
    startDate: Date,
    endDate: Date
  ) {
    if (userIds.length === 0 && userEmails.length === 0) return [];

    return this.prisma.booking.findMany({
      where: {
        OR: [
          { userId: { in: userIds } },
          { attendees: { some: { email: { in: userEmails } } } },
        ],
        status: BookingStatus.ACCEPTED,
        startTime: { gte: startDate },
        endTime: { lte: endDate },
      },
      select: {
        id: true,
        startTime: true,
        endTime: true,
        userId: true,
        attendees: {
          select: {
            email: true,
          },
        },
      },
    });
  }
}