import type { Prisma } from "@prisma/client";

import prisma, { bookingMinimalSelect } from "@calcom/prisma";
import type { Booking } from "@calcom/prisma/client";
import { BookingStatus } from "@calcom/prisma/enums";

import { UserRepository } from "./user";

type TeamBookingsParamsBase = {
  user: { id: number; email: string };
  teamId: number;
  startDate: Date;
  endDate: Date;
  excludedUid?: string | null;
  includeManagedEvents: boolean;
  shouldReturnCount?: boolean;
};

type TeamBookingsParamsWithCount = TeamBookingsParamsBase & {
  shouldReturnCount: true;
};

type TeamBookingsParamsWithoutCount = TeamBookingsParamsBase;

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

  static async findBookingByUid({ bookingUid }: { bookingUid: string }) {
    return await prisma.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: bookingMinimalSelect,
    });
  }

  static async findBookingForMeetingPage({ bookingUid }: { bookingUid: string }) {
    return await prisma.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        ...bookingMinimalSelect,
        uid: true,
        description: true,
        isRecorded: true,
        user: {
          select: {
            id: true,
            timeZone: true,
            name: true,
            email: true,
            username: true,
          },
        },
        references: {
          select: {
            id: true,
            uid: true,
            type: true,
            meetingUrl: true,
            meetingPassword: true,
          },
          where: {
            type: "daily_video",
          },
        },
      },
    });
  }

  static async findBookingForMeetingEndedPage({ bookingUid }: { bookingUid: string }) {
    return await prisma.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        ...bookingMinimalSelect,
        uid: true,
        user: {
          select: {
            credentials: true,
          },
        },
        references: {
          select: {
            uid: true,
            type: true,
            meetingUrl: true,
          },
        },
      },
    });
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

  static async updateLocationById({
    where: { id },
    data: { location, metadata, referencesToCreate },
  }: {
    where: { id: number };
    data: {
      location: string;
      metadata: Record<string, unknown>;
      referencesToCreate: Prisma.BookingReferenceCreateInput[];
    };
  }) {
    await prisma.booking.update({
      where: {
        id,
      },
      data: {
        location,
        metadata,
        references: {
          create: referencesToCreate,
        },
      },
    });
  }

  static async getAllAcceptedTeamBookingsOfUser(params: TeamBookingsParamsWithCount): Promise<number>;

  static async getAllAcceptedTeamBookingsOfUser(
    params: TeamBookingsParamsWithoutCount
  ): Promise<Array<Booking>>;

  static async getAllAcceptedTeamBookingsOfUser(params: TeamBookingsParamsBase) {
    const { user, teamId, startDate, endDate, excludedUid, shouldReturnCount, includeManagedEvents } = params;

    const baseWhere: Prisma.BookingWhereInput = {
      status: BookingStatus.ACCEPTED,
      startTime: {
        gte: startDate,
      },
      endTime: {
        lte: endDate,
      },
      ...(excludedUid && {
        uid: {
          not: excludedUid,
        },
      }),
    };

    const whereCollectiveRoundRobinOwner: Prisma.BookingWhereInput = {
      ...baseWhere,
      userId: user.id,
      eventType: {
        teamId,
      },
    };

    const whereCollectiveRoundRobinBookingsAttendee: Prisma.BookingWhereInput = {
      ...baseWhere,
      attendees: {
        some: {
          email: user.email,
        },
      },
      eventType: {
        teamId,
      },
    };

    const whereManagedBookings: Prisma.BookingWhereInput = {
      ...baseWhere,
      userId: user.id,
      eventType: {
        parent: {
          teamId,
        },
      },
    };

    if (shouldReturnCount) {
      const collectiveRoundRobinBookingsOwner = await prisma.booking.count({
        where: whereCollectiveRoundRobinOwner,
      });

      const collectiveRoundRobinBookingsAttendee = await prisma.booking.count({
        where: whereCollectiveRoundRobinBookingsAttendee,
      });

      let managedBookings = 0;

      if (includeManagedEvents) {
        managedBookings = await prisma.booking.count({
          where: whereManagedBookings,
        });
      }

      const totalNrOfBooking =
        collectiveRoundRobinBookingsOwner + collectiveRoundRobinBookingsAttendee + managedBookings;

      return totalNrOfBooking;
    }
    const collectiveRoundRobinBookingsOwner = await prisma.booking.findMany({
      where: whereCollectiveRoundRobinOwner,
    });

    const collectiveRoundRobinBookingsAttendee = await prisma.booking.findMany({
      where: whereCollectiveRoundRobinBookingsAttendee,
    });

    let managedBookings: typeof collectiveRoundRobinBookingsAttendee = [];

    if (includeManagedEvents) {
      managedBookings = await prisma.booking.findMany({
        where: whereManagedBookings,
      });
    }

    return [
      ...collectiveRoundRobinBookingsOwner,
      ...collectiveRoundRobinBookingsAttendee,
      ...managedBookings,
    ];
  }

  static async findOriginalRescheduledBooking(uid: string, seatsEventType?: boolean) {
    return await prisma.booking.findFirst({
      where: {
        uid: uid,
        status: {
          in: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED, BookingStatus.PENDING],
        },
      },
      include: {
        attendees: {
          select: {
            name: true,
            email: true,
            locale: true,
            timeZone: true,
            phoneNumber: true,
            ...(seatsEventType && { bookingSeat: true, id: true }),
          },
        },
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            locale: true,
            timeZone: true,
            destinationCalendar: true,
            credentials: {
              select: {
                id: true,
                userId: true,
                key: true,
                type: true,
                teamId: true,
                appId: true,
                invalid: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
          },
        },
        destinationCalendar: true,
        payment: true,
        references: true,
        workflowReminders: true,
      },
    });
  }
}
