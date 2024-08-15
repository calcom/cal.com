import type { Prisma } from "@prisma/client";

import prisma from "@calcom/prisma";
import { BookingStatus } from "@calcom/prisma/enums";

import { UserRepository } from "./user";

export class BookingRepository {
  static async getBookingAttendees(bookingId: number) {
    return await prisma.attendee.findMany({
      where: {
        bookingId,
      },
    });
  }

  /** Determines if the user is the organizer, team admin, or org admin that the booking was created under */
  static async doesUserIdHaveAccessToBooking({ userId, bookingId }: { userId: number; bookingId: number }) {
    const booking = await prisma.booking.findFirst({
      where: {
        id: bookingId,
      },
      select: {
        userId: true,
        eventType: {
          select: {
            teamId: true,
          },
        },
      },
    });

    if (!booking) return false;

    if (userId === booking.userId) return true;

    // If the booking doesn't belong to the user and there's no team then return early
    if (!booking.eventType || !booking.eventType.teamId) return false;

    // TODO add checks for team and org
    const isAdminOrUser = await UserRepository.isAdminOfTeamOrParentOrg({
      userId,
      teamId: booking.eventType.teamId,
    });

    return isAdminOrUser;
  }

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

  static async findBookingByUidAndUserId({ bookingUid, userId }: { bookingUid: string; userId: number }) {
    return await prisma.booking.findFirst({
      where: {
        uid: bookingUid,
        OR: [
          { userId: userId },
          {
            eventType: {
              hosts: {
                some: {
                  userId,
                },
              },
            },
          },
          {
            eventType: {
              users: {
                some: {
                  id: userId,
                },
              },
            },
          },
          {
            eventType: {
              team: {
                members: {
                  some: {
                    userId,
                    accepted: true,
                    role: {
                      in: ["ADMIN", "OWNER"],
                    },
                  },
                },
              },
            },
          },
        ],
      },
    });
  }
}
