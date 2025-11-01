import { UserRepository } from "@calcom/features/users/repositories/UserRepository";
import { withReporting } from "@calcom/lib/sentryWrapper";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { Booking } from "@calcom/prisma/client";
import { RRTimestampBasis, BookingStatus } from "@calcom/prisma/enums";
import { bookingMinimalSelect } from "@calcom/prisma/selects/booking";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

export type FormResponse = Record<
  // Field ID
  string,
  {
    value: number | string | string[];
    label: string;
    identifier?: string;
  }
>;

type TeamBookingsParamsBase = {
  user: { id: number; email: string };
  teamId: number;
  startDate: Date;
  endDate: Date;
  excludedUid?: string | null;
  includeManagedEvents: boolean;
  shouldReturnCount?: boolean;
};

type TeamBookingsMultipleUsersParamsBase = {
  users: { id: number; email: string }[];
  teamId: number;
  startDate: Date;
  endDate: Date;
  excludedUid?: string | null;
  includeManagedEvents: boolean;
  shouldReturnCount?: boolean;
};

type TeamBookingsMultipleUsersParamsWithCount = TeamBookingsMultipleUsersParamsBase & {
  shouldReturnCount: true;
};

type TeamBookingsMultipleUsersParamsWithoutCount = TeamBookingsMultipleUsersParamsBase;

type TeamBookingsParamsWithCount = TeamBookingsParamsBase & {
  shouldReturnCount: true;
};

type TeamBookingsParamsWithoutCount = TeamBookingsParamsBase;

const buildWhereClauseForActiveBookings = ({
  eventTypeId,
  startDate,
  endDate,
  users,
  virtualQueuesData,
  includeNoShowInRRCalculation = false,
  rrTimestampBasis,
}: {
  eventTypeId: number;
  startDate?: Date;
  endDate?: Date;
  users: { id: number; email: string }[];
  virtualQueuesData: {
    chosenRouteId: string;
    fieldOptionData: {
      fieldId: string;
      selectedOptionIds: string | number | string[];
    };
  } | null;
  includeNoShowInRRCalculation: boolean;
  rrTimestampBasis: RRTimestampBasis;
}): Prisma.BookingWhereInput => ({
  OR: [
    {
      userId: {
        in: users.map((user) => user.id),
      },
      ...(!includeNoShowInRRCalculation
        ? {
            OR: [{ noShowHost: false }, { noShowHost: null }],
          }
        : {}),
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
  ...(!includeNoShowInRRCalculation ? { attendees: { some: { noShow: false } } } : {}),
  status: BookingStatus.ACCEPTED,
  eventTypeId,
  ...(startDate || endDate
    ? rrTimestampBasis === RRTimestampBasis.CREATED_AT
      ? {
          createdAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {
          startTime: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
    : {}),
  ...(virtualQueuesData
    ? {
        routedFromRoutingFormReponse: {
          chosenRouteId: virtualQueuesData.chosenRouteId,
        },
      }
    : {}),
});

export class BookingRepository {
  constructor(private prismaClient: PrismaClient) {}

  async getBookingAttendees(bookingId: number) {
    return await this.prismaClient.attendee.findMany({
      where: {
        bookingId,
      },
    });
  }

  async getBookingWithEventTypeTeamId({ bookingId }: { bookingId: number }) {
    return await this.prismaClient.booking.findUnique({
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
  }

  async findByUidIncludeEventType({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        userId: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        attendees: {
          select: {
            email: true,
          },
        },
        eventType: {
          select: {
            teamId: true,
            hosts: {
              select: {
                userId: true,
                user: {
                  select: {
                    email: true,
                  },
                },
              },
            },
            users: {
              select: {
                id: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  /** Determines if the user is the organizer, team admin, or org admin that the booking was created under */
  async doesUserIdHaveAccessToBooking({ userId, bookingId }: { userId: number; bookingId: number }) {
    const booking = await this.prismaClient.booking.findUnique({
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
    const userRepo = new UserRepository(this.prismaClient);
    const isAdminOrUser = await userRepo.isAdminOfTeamOrParentOrg({
      userId,
      teamId: booking.eventType.teamId,
    });

    return isAdminOrUser;
  }

  async findFirstBookingByReschedule({ originalBookingUid }: { originalBookingUid: string }) {
    return await this.prismaClient.booking.findFirst({
      where: {
        fromReschedule: originalBookingUid,
      },
      select: {
        uid: true,
      },
    });
  }

  async findReschedulerByUid({ uid }: { uid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid,
      },
      select: {
        rescheduledBy: true,
        uid: true,
      },
    });
  }

  async findByUidIncludeReport({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        id: true,
        uid: true,
        startTime: true,
        status: true,
        recurringEventId: true,
        attendees: {
          select: {
            email: true,
          },
        },
        seatsReferences: {
          select: {
            referenceUid: true,
            attendee: {
              select: {
                email: true,
              },
            },
          },
        },
        report: {
          select: {
            id: true,
          },
        },
      },
    });
  }

  async getActiveRecurringBookingsFromDate({
    recurringEventId,
    fromDate,
  }: {
    recurringEventId: string;
    fromDate: Date;
  }) {
    return await this.prismaClient.booking.findMany({
      where: {
        recurringEventId,
        startTime: { gte: fromDate },
        status: { in: [BookingStatus.ACCEPTED, BookingStatus.PENDING] },
      },
      select: { id: true, uid: true },
      orderBy: { startTime: "asc" },
    });
  }

  private async _findAllExistingBookingsForEventTypeBetween({
    eventTypeId,
    seatedEvent = false,
    startDate,
    endDate,
    userIdAndEmailMap,
  }: {
    startDate: Date;
    endDate: Date;
    eventTypeId?: number | null;
    seatedEvent?: boolean;
    userIdAndEmailMap: Map<number, string>;
  }) {
    const sharedQuery = {
      startTime: { lte: endDate },
      endTime: { gte: startDate },
      status: {
        in: [BookingStatus.ACCEPTED],
      },
    };

    const bookingsSelect = {
      id: true,
      uid: true,
      userId: true,
      startTime: true,
      endTime: true,
      title: true,
      attendees: true,
      eventType: {
        select: {
          id: true,
          onlyShowFirstAvailableSlot: true,
          afterEventBuffer: true,
          beforeEventBuffer: true,
          seatsPerTimeSlot: true,
          requiresConfirmationWillBlockSlot: true,
          requiresConfirmation: true,
          allowReschedulingPastBookings: true,
          hideOrganizerEmail: true,
        },
      },
      ...(seatedEvent && {
        _count: {
          select: {
            seatsReferences: true,
          },
        },
      }),
    } satisfies Prisma.BookingSelect;

    const currentBookingsAllUsersQueryOne = this.prismaClient.booking.findMany({
      where: {
        ...sharedQuery,
        userId: {
          in: Array.from(userIdAndEmailMap.keys()),
        },
      },
      select: bookingsSelect,
    });

    const currentBookingsAllUsersQueryTwo = this.prismaClient.booking.findMany({
      where: {
        ...sharedQuery,
        attendees: {
          some: {
            email: {
              in: Array.from(userIdAndEmailMap.values()),
            },
          },
        },
      },
      select: bookingsSelect,
    });

    const currentBookingsAllUsersQueryThree = eventTypeId
      ? this.prismaClient.booking.findMany({
          where: {
            startTime: { lte: endDate },
            endTime: { gte: startDate },
            eventType: {
              id: eventTypeId,
              requiresConfirmation: true,
              requiresConfirmationWillBlockSlot: true,
            },
            status: {
              in: [BookingStatus.PENDING],
            },
          },
          select: bookingsSelect,
        })
      : [];

    const [resultOne, resultTwo, resultThree] = await Promise.all([
      currentBookingsAllUsersQueryOne,
      currentBookingsAllUsersQueryTwo,
      currentBookingsAllUsersQueryThree,
    ]);
    // Prevent duplicate booking records when the organizer books his own event type.
    //
    // *Three is about PENDING, so will never overlap
    // with the other two, which are about ACCEPTED. But ACCEPTED affects *One & *Two
    // and WILL result in a duplicate booking if the organizer books himself.
    const resultTwoWithOrganizersRemoved = resultTwo.filter((booking) => {
      if (!booking.userId) return true;
      const organizerEmail = userIdAndEmailMap.get(booking.userId);
      return !booking.attendees.some((attendee) => attendee.email === organizerEmail);
    });

    return [...resultOne, ...resultTwoWithOrganizersRemoved, ...resultThree];
  }

  findAllExistingBookingsForEventTypeBetween = withReporting(
    this._findAllExistingBookingsForEventTypeBetween.bind(this),
    "findAllExistingBookingsForEventTypeBetween"
  );

  async getAllBookingsForRoundRobin({
    users,
    eventTypeId,
    startDate,
    endDate,
    virtualQueuesData,
    includeNoShowInRRCalculation,
    rrTimestampBasis,
  }: {
    users: { id: number; email: string }[];
    eventTypeId: number;
    startDate?: Date;
    endDate?: Date;
    virtualQueuesData: {
      chosenRouteId: string;
      fieldOptionData: {
        fieldId: string;
        selectedOptionIds: string | number | string[];
      };
    } | null;
    includeNoShowInRRCalculation: boolean;
    rrTimestampBasis: RRTimestampBasis;
  }) {
    const allBookings = await this.prismaClient.booking.findMany({
      where: buildWhereClauseForActiveBookings({
        eventTypeId,
        startDate,
        endDate,
        users,
        virtualQueuesData,
        includeNoShowInRRCalculation,
        rrTimestampBasis,
      }),
      select: {
        id: true,
        attendees: true,
        userId: true,
        createdAt: true,
        status: true,
        startTime: true,
        routedFromRoutingFormReponse: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    let queueBookings = allBookings;

    if (virtualQueuesData) {
      queueBookings = allBookings.filter((booking) => {
        const responses = booking.routedFromRoutingFormReponse;
        const fieldId = virtualQueuesData.fieldOptionData.fieldId;
        const selectedOptionIds = virtualQueuesData.fieldOptionData.selectedOptionIds;

        const response = responses?.response as FormResponse;

        const responseValue = response[fieldId].value;

        if (Array.isArray(responseValue) && Array.isArray(selectedOptionIds)) {
          //check if all values are the same (this only support 'all in' not 'any in')
          return (
            responseValue.length === selectedOptionIds.length &&
            responseValue.every((value, index) => value === selectedOptionIds[index])
          );
        } else {
          return responseValue === selectedOptionIds;
        }
      });
    }
    return queueBookings;
  }

  async findBookingByUid({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: bookingMinimalSelect,
    });
  }

  async findFirstBookingFromResponse({ responseId }: { responseId: number }) {
    const booking = await this.prismaClient.booking.findFirst({
      where: {
        routedFromRoutingFormReponse: {
          id: responseId,
        },
      },
      select: {
        id: true,
      },
    });

    return booking;
  }

  async findBookingByUidWithEventType({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      include: {
        eventType: true,
      },
    });
  }

  async findByIdIncludeUserAndAttendees(bookingId: number) {
    return await this.prismaClient.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        ...bookingMinimalSelect,
        eventType: {
          select: {
            title: true,
          },
        },
        user: {
          select: {
            id: true,
            username: true,
          },
        },
        attendees: {
          select: {
            name: true,
            email: true,
            phoneNumber: true,
          },
          // Ascending order ensures that the first attendee in the list is the booker and others are guests
          // See why it is important https://github.com/calcom/cal.com/pull/20935
          // TODO: Ideally we should return `booker` property directly from the booking
          orderBy: {
            id: "asc",
          },
        },
      },
    });
  }

  async findBookingForMeetingPage({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        ...bookingMinimalSelect,
        uid: true,
        description: true,
        isRecorded: true,
        eventType: {
          select: {
            id: true,
            hideOrganizerEmail: true,
            calVideoSettings: {
              select: {
                disableRecordingForGuests: true,
                disableRecordingForOrganizer: true,
                enableAutomaticTranscription: true,
                enableAutomaticRecordingForOrganizer: true,
                disableTranscriptionForGuests: true,
                disableTranscriptionForOrganizer: true,
                redirectUrlOnExit: true,
              },
            },
          },
        },
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
            deleted: null,
          },
          orderBy: {
            id: "asc",
          },
        },
      },
    });
  }

  async findBookingForMeetingEndedPage({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
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

  async findBookingByUidAndUserId({ bookingUid, userId }: { bookingUid: string; userId: number }) {
    return await this.prismaClient.booking.findFirst({
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
          {
            eventType: {
              parent: {
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
          },
        ],
      },
    });
  }

  async updateLocationById({
    where: { id },
    data: { location, metadata, referencesToCreate, responses, iCalSequence },
  }: {
    where: { id: number };
    data: {
      location: string;
      metadata: Record<string, unknown>;
      referencesToCreate: Prisma.BookingReferenceCreateInput[];
      responses?: Record<string, unknown>;
      iCalSequence?: number;
    };
  }) {
    await this.prismaClient.booking.update({
      where: {
        id,
      },
      data: {
        location,
        // FIXME: metadata is untyped
        metadata: metadata as unknown as Prisma.InputJsonValue,
        // FIXME: responses is untyped
        ...(responses && { responses: responses as unknown as Prisma.InputJsonValue }),
        ...(iCalSequence !== undefined && { iCalSequence }),
        references: {
          create: referencesToCreate,
        },
      },
    });
  }

  async getAllAcceptedTeamBookingsOfUser(params: TeamBookingsParamsWithCount): Promise<number>;

  async getAllAcceptedTeamBookingsOfUser(params: TeamBookingsParamsWithoutCount): Promise<Array<Booking>>;

  async getAllAcceptedTeamBookingsOfUser(params: TeamBookingsParamsBase) {
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
      const collectiveRoundRobinBookingsOwner = await this.prismaClient.booking.count({
        where: whereCollectiveRoundRobinOwner,
      });

      const collectiveRoundRobinBookingsAttendee = await this.prismaClient.booking.count({
        where: whereCollectiveRoundRobinBookingsAttendee,
      });

      let managedBookings = 0;

      if (includeManagedEvents) {
        managedBookings = await this.prismaClient.booking.count({
          where: whereManagedBookings,
        });
      }

      const totalNrOfBooking =
        collectiveRoundRobinBookingsOwner + collectiveRoundRobinBookingsAttendee + managedBookings;

      return totalNrOfBooking;
    }
    const collectiveRoundRobinBookingsOwner = await this.prismaClient.booking.findMany({
      where: whereCollectiveRoundRobinOwner,
    });

    const collectiveRoundRobinBookingsAttendee = await this.prismaClient.booking.findMany({
      where: whereCollectiveRoundRobinBookingsAttendee,
    });

    let managedBookings: typeof collectiveRoundRobinBookingsAttendee = [];

    if (includeManagedEvents) {
      managedBookings = await this.prismaClient.booking.findMany({
        where: whereManagedBookings,
      });
    }

    return [
      ...collectiveRoundRobinBookingsOwner,
      ...collectiveRoundRobinBookingsAttendee,
      ...managedBookings,
    ];
  }

  async findOriginalRescheduledBooking(uid: string, seatsEventType?: boolean) {
    return await this.prismaClient.booking.findFirst({
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
            username: true,
            email: true,
            locale: true,
            timeZone: true,
            timeFormat: true,
            destinationCalendar: true,
            credentials: {
              select: credentialForCalendarServiceSelect,
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

  async getAllAcceptedTeamBookingsOfUsers(params: TeamBookingsMultipleUsersParamsWithCount): Promise<number>;

  async getAllAcceptedTeamBookingsOfUsers(
    params: TeamBookingsMultipleUsersParamsWithoutCount
  ): Promise<Array<Booking>>;

  async getAllAcceptedTeamBookingsOfUsers(params: TeamBookingsMultipleUsersParamsBase) {
    const { users, teamId, startDate, endDate, excludedUid, shouldReturnCount, includeManagedEvents } =
      params;

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

    const userIds = users.map((user) => user.id);
    const userEmails = users.map((user) => user.email);

    const whereCollectiveRoundRobinOwner: Prisma.BookingWhereInput = {
      ...baseWhere,
      userId: {
        in: userIds,
      },
      eventType: {
        teamId,
      },
    };

    const whereCollectiveRoundRobinBookingsAttendee: Prisma.BookingWhereInput = {
      ...baseWhere,
      attendees: {
        some: {
          email: {
            in: userEmails,
          },
        },
      },
      eventType: {
        teamId,
      },
    };

    const whereManagedBookings: Prisma.BookingWhereInput = {
      ...baseWhere,
      userId: {
        in: userIds,
      },
      eventType: {
        parent: {
          teamId,
        },
      },
    };

    if (shouldReturnCount) {
      const collectiveRoundRobinBookingsOwner = await this.prismaClient.booking.count({
        where: whereCollectiveRoundRobinOwner,
      });

      const collectiveRoundRobinBookingsAttendee = await this.prismaClient.booking.count({
        where: whereCollectiveRoundRobinBookingsAttendee,
      });

      let managedBookings = 0;

      if (includeManagedEvents) {
        managedBookings = await this.prismaClient.booking.count({
          where: whereManagedBookings,
        });
      }

      const totalNrOfBooking =
        collectiveRoundRobinBookingsOwner + collectiveRoundRobinBookingsAttendee + managedBookings;

      return totalNrOfBooking;
    }

    const collectiveRoundRobinBookingsOwner = await this.prismaClient.booking.findMany({
      where: whereCollectiveRoundRobinOwner,
    });

    const collectiveRoundRobinBookingsAttendee = await this.prismaClient.booking.findMany({
      where: whereCollectiveRoundRobinBookingsAttendee,
    });

    let managedBookings: typeof collectiveRoundRobinBookingsAttendee = [];

    if (includeManagedEvents) {
      managedBookings = await this.prismaClient.booking.findMany({
        where: whereManagedBookings,
      });
    }

    return [
      ...collectiveRoundRobinBookingsOwner,
      ...collectiveRoundRobinBookingsAttendee,
      ...managedBookings,
    ];
  }

  async getValidBookingFromEventTypeForAttendee({
    eventTypeId,
    bookerEmail,
    bookerPhoneNumber,
    startTime,
    filterForUnconfirmed,
  }: {
    eventTypeId: number;
    bookerEmail?: string;
    bookerPhoneNumber?: string;
    startTime: Date;
    filterForUnconfirmed?: boolean;
  }) {
    return await this.prismaClient.booking.findFirst({
      where: {
        eventTypeId,
        attendees: {
          some: {
            email: bookerEmail,
            phoneNumber: bookerPhoneNumber,
          },
        },
        startTime,
        status: filterForUnconfirmed ? BookingStatus.PENDING : BookingStatus.ACCEPTED,
      },
      include: {
        attendees: true,
        references: true,
        user: true,
        payment: true,
      },
    });
  }

  async countBookingsByEventTypeAndDateRange({
    eventTypeId,
    startDate,
    endDate,
    excludedUid,
  }: {
    eventTypeId: number;
    startDate: Date;
    endDate: Date;
    excludedUid?: string;
  }) {
    return await this.prismaClient.booking.count({
      where: {
        status: BookingStatus.ACCEPTED,
        eventTypeId,
        startTime: {
          gte: startDate,
        },
        endTime: {
          lte: endDate,
        },
        uid: {
          not: excludedUid,
        },
      },
    });
  }

  async findAcceptedBookingByEventTypeId({
    eventTypeId,
    dateFrom,
    dateTo,
  }: {
    eventTypeId?: number;
    dateFrom: string;
    dateTo: string;
  }) {
    return this.prismaClient.booking.findMany({
      where: {
        eventTypeId,
        startTime: {
          gte: dateFrom,
          lte: dateTo,
        },
        status: BookingStatus.ACCEPTED,
      },
      select: {
        uid: true,
        startTime: true,
        attendees: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  async getTotalBookingDuration({
    eventId,
    startDate,
    endDate,
    rescheduleUid,
  }: {
    eventId: number;
    startDate: Date;
    endDate: Date;
    rescheduleUid?: string;
  }) {
    let totalBookingTime;

    if (rescheduleUid) {
      [totalBookingTime] = await this.prismaClient.$queryRaw<[{ totalMinutes: number | null }]>`
      SELECT SUM(EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60) as "totalMinutes"
      FROM "Booking"
      WHERE "status" = 'accepted'
        AND "eventTypeId" = ${eventId}
        AND "startTime" >= ${startDate}
        AND "endTime" <= ${endDate}
        AND "uid" != ${rescheduleUid};
    `;
    } else {
      [totalBookingTime] = await this.prismaClient.$queryRaw<[{ totalMinutes: number | null }]>`
      SELECT SUM(EXTRACT(EPOCH FROM ("endTime" - "startTime")) / 60) as "totalMinutes"
      FROM "Booking"
      WHERE "status" = 'accepted'
        AND "eventTypeId" = ${eventId}
        AND "startTime" >= ${startDate}
        AND "endTime" <= ${endDate};
    `;
    }
    return totalBookingTime.totalMinutes ?? 0;
  }

  async findOriginalRescheduledBookingUserId({ rescheduleUid }: { rescheduleUid: string }) {
    return await this.prismaClient.booking.findFirst({
      where: {
        uid: rescheduleUid,
        status: {
          in: [BookingStatus.ACCEPTED, BookingStatus.CANCELLED, BookingStatus.PENDING],
        },
      },
      select: {
        userId: true,
        attendees: {
          select: {
            email: true,
          },
        },
      },
    });
  }

  async getBookingForPaymentProcessing(bookingId: number) {
    return await this.prismaClient.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        uid: true,
        title: true,
        startTime: true,
        endTime: true,
        userPrimaryEmail: true,
        status: true,
        eventTypeId: true,
        userId: true,
        attendees: {
          select: {
            name: true,
            email: true,
            timeZone: true,
            locale: true,
          },
        },
        eventType: {
          select: {
            title: true,
            hideOrganizerEmail: true,
            teamId: true,
            metadata: true,
          },
        },
        payment: {
          select: {
            id: true,
            amount: true,
            currency: true,
            paymentOption: true,
            appId: true,
            success: true,
            data: true,
          },
        },
      },
    });
  }

  async getBookingForCalEventBuilder(bookingId: number) {
    return await this.prismaClient.booking.findUnique({
      where: { id: bookingId },
      select: {
        uid: true,
        title: true,
        startTime: true,
        endTime: true,
        description: true,
        customInputs: true,
        responses: true,
        metadata: true,
        location: true,
        iCalUID: true,
        iCalSequence: true,
        oneTimePassword: true,
        attendees: {
          select: {
            name: true,
            email: true,
            timeZone: true,
            locale: true,
            phoneNumber: true,
          },
        },
        user: {
          // Organizer
          select: {
            id: true,
            name: true,
            email: true,
            username: true,
            timeZone: true,
            locale: true,
            timeFormat: true,
            destinationCalendar: true,
            profiles: { select: { organizationId: true } },
          },
        },
        // destination calendar of the Organizer
        destinationCalendar: true,
        eventType: {
          select: {
            id: true,
            slug: true,
            description: true,
            hideCalendarNotes: true,
            hideCalendarEventDetails: true,
            hideOrganizerEmail: true,
            schedulingType: true,
            seatsPerTimeSlot: true,
            seatsShowAttendees: true,
            seatsShowAvailabilityCount: true,
            customReplyToEmail: true,
            disableRescheduling: true,
            disableCancelling: true,
            requiresConfirmation: true,
            recurringEvent: true,
            bookingFields: true,
            metadata: true,
            eventName: true,
            team: {
              select: {
                id: true,
                name: true,
                parentId: true,
                members: {
                  select: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        username: true,
                        timeZone: true,
                        locale: true,
                        timeFormat: true,
                      },
                    },
                  },
                },
              },
            },
            users: {
              select: {
                id: true,
                name: true,
                email: true,
                username: true,
                timeZone: true,
                locale: true,
                timeFormat: true,
                destinationCalendar: true,
              },
            },
            hosts: {
              select: {
                userId: true,
                isFixed: true,
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    username: true,
                    timeZone: true,
                    locale: true,
                    timeFormat: true,
                    destinationCalendar: true,
                  },
                },
              },
            },
            workflows: {
              select: {
                workflow: {
                  select: {
                    id: true,
                  },
                },
              },
            },
          },
        },
        references: {
          select: {
            type: true,
            meetingId: true,
            meetingPassword: true,
            meetingUrl: true,
          },
          where: {
            type: {
              endsWith: "_video",
            },
          },
        },
        seatsReferences: {
          select: {
            id: true,
            referenceUid: true,
            attendee: { select: { id: true, email: true, phoneNumber: true } },
          },
        },
      },
    });
  }
  async findByIdIncludeDestinationCalendar(bookingId: number) {
    return await this.prismaClient.booking.findUnique({
      where: {
        id: bookingId,
      },
      include: {
        attendees: true,
        eventType: true,
        destinationCalendar: true,
        references: true,
        user: {
          include: {
            destinationCalendar: true,
            credentials: true,
          },
        },
      },
    });
  }

  async updateBookingAttendees({
    bookingId,
    newAttendees,
    updatedResponses,
  }: {
    bookingId: number;
    newAttendees: { name: string; email: string; timeZone: string; locale: string | null }[];
    updatedResponses: Prisma.InputJsonValue;
  }) {
    return await this.prismaClient.booking.update({
      where: {
        id: bookingId,
      },
      include: {
        attendees: true,
      },
      data: {
        attendees: {
          createMany: {
            data: newAttendees,
          },
        },
        responses: updatedResponses,
      },
    });
  }
}
