import { withReporting } from "@calcom/lib/sentryWrapper";
import type { PrismaClient } from "@calcom/prisma";
import type { Prisma } from "@calcom/prisma/client";
import type { Booking } from "@calcom/prisma/client";
import { RRTimestampBasis, BookingStatus } from "@calcom/prisma/enums";
import {
  bookingMinimalSelect,
  bookingAuthorizationCheckSelect,
  bookingDetailsSelect,
} from "@calcom/prisma/selects/booking";
import { credentialForCalendarServiceSelect } from "@calcom/prisma/selects/credential";

import type {
  IBookingRepository,
  BookingBasicDto,
  BookingInstantLocationDto,
  BookingExistsDto,
  BookingFullContextDto,
  BookingForConfirmationDto,
  BookingUpdateResultDto,
  BookingBatchUpdateResultDto,
} from "./IBookingRepository";

type ManagedEventReassignmentCreateParams = {
  uid: string;
  userId: number;
  userPrimaryEmail: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  status: BookingStatus;
  location: string | null;
  smsReminderNumber: string | null;
  responses?: Prisma.JsonValue | null;
  customInputs?: Record<string, unknown> | null;
  metadata?: Record<string, unknown> | null;
  idempotencyKey: string;
  eventTypeId: number;
  attendees: {
    name: string;
    email: string;
    timeZone: string;
    locale: string | null;
    phoneNumber?: string | null;
  }[];
  paymentId?: number;
  iCalUID: string;
  iCalSequence: number;
  tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
};

export type ManagedEventReassignmentCreatedBooking = {
  id: number;
  uid: string;
  title: string;
  description: string | null;
  startTime: Date;
  endTime: Date;
  location: string | null;
  metadata: Prisma.JsonValue;
  responses: Prisma.JsonValue;
  iCalUID: string | null;
  iCalSequence: number;
  smsReminderNumber: string | null;
  attendees: {
    name: string;
    email: string;
    timeZone: string;
    locale: string | null;
  }[];
};

export type ManagedEventCancellationResult = {
  id: number;
  uid: string;
  metadata: Prisma.JsonValue;
  status: BookingStatus;
};

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

const selectStatementToGetBookingForCalEventBuilder = {
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
      bookingSeat: {
        select: {
          id: true,
          referenceUid: true,
          bookingId: true,
          attendeeId: true,
          data: true,
          metadata: true,
        },
      },
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
      title: true,
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
    },
  },
  references: {
    where: {
      deleted: null,
    },
    select: {
      type: true,
      meetingId: true,
      meetingPassword: true,
      meetingUrl: true,
      uid: true,
    },
  },
  seatsReferences: {
    select: {
      id: true,
      referenceUid: true,
      attendee: { select: { id: true, email: true, phoneNumber: true } },
    },
  },
};

export class BookingRepository implements IBookingRepository {
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
            parent: {
              select: {
                teamId: true,
              },
            },
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

  async findByIdIncludeEventType({ bookingId }: { bookingId: number }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        id: bookingId,
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
            parent: {
              select: {
                teamId: true,
              },
            },
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

  async findByUidForAuthorizationCheck({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: bookingAuthorizationCheckSelect,
    });
  }

  async findByUidForDetails({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: bookingDetailsSelect,
    });
  }

  async findRescheduledToBooking({ bookingUid }: { bookingUid: string }) {
    return await this.prismaClient.booking.findFirst({
      where: {
        fromReschedule: bookingUid,
      },
      select: {
        uid: true,
      },
    });
  }

  async findPreviousBooking({ fromReschedule }: { fromReschedule: string }) {
    return await this.prismaClient.booking.findUnique({
      where: {
        uid: fromReschedule,
      },
      select: {
        uid: true,
        startTime: true,
        endTime: true,
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

  async findBookingIncludeCalVideoSettingsAndReferences({ bookingUid }: { bookingUid: string }) {
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
            calVideoSettings: {
              select: {
                disableRecordingForGuests: true,
                disableRecordingForOrganizer: true,
                enableAutomaticTranscription: true,
                enableAutomaticRecordingForOrganizer: true,
                disableTranscriptionForGuests: true,
                disableTranscriptionForOrganizer: true,
                redirectUrlOnExit: true,
                requireEmailForGuests: true,
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
        eventType: {
          select: {
            id: true,
            minimumRescheduleNotice: true,
            disableRescheduling: true,
            userId: true,
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
        user: {
          select: {
            email: true,
            name: true,
            timeZone: true,
            locale: true,
            profiles: {
              select: {
                organizationId: true,
              },
            },
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
      select: selectStatementToGetBookingForCalEventBuilder,
    });
  }

  async getBookingForCalEventBuilderFromUid(bookingUid: string) {
    return this.prismaClient.booking.findUnique({
      where: { uid: bookingUid },
      select: selectStatementToGetBookingForCalEventBuilder,
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
            profiles: {
              select: {
                organizationId: true,
              },
            },
          },
        },
      },
    });
  }

  async findByIdForReassignment(bookingId: number) {
    return await this.prismaClient.booking.findUnique({
      where: {
        id: bookingId,
      },
      select: {
        id: true,
        uid: true,
        eventTypeId: true,
        userId: true,
        startTime: true,
        endTime: true,
      },
    });
  }

  async findByIdWithAttendeesPaymentAndReferences(bookingId: number) {
    return await this.prismaClient.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        uid: true,
        title: true,
        description: true,
        customInputs: true,
        responses: true,
        startTime: true,
        endTime: true,
        metadata: true,
        status: true,
        location: true,
        smsReminderNumber: true,
        iCalUID: true,
        iCalSequence: true,
        eventTypeId: true,
        userId: true,
        attendees: {
          select: {
            name: true,
            email: true,
            timeZone: true,
            locale: true,
            phoneNumber: true,
          },
          orderBy: {
            id: "asc",
          },
        },
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            name: true,
            timeZone: true,
            locale: true,
            timeFormat: true,
          },
        },
        payment: {
          select: {
            id: true,
          },
        },
        references: {
          select: {
            uid: true,
            type: true,
            meetingUrl: true,
            meetingId: true,
            meetingPassword: true,
            externalCalendarId: true,
            credentialId: true,
            thirdPartyRecurringEventId: true,
            delegationCredentialId: true,
          },
        },
        workflowReminders: {
          select: {
            id: true,
            referenceId: true,
            method: true,
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

  findByUidIncludeEventTypeAndReferences({ bookingUid }: { bookingUid: string }) {
    return this.prismaClient.booking.findUniqueOrThrow({
      where: {
        uid: bookingUid,
      },
      select: {
        id: true,
        uid: true,
        userId: true,
        status: true,
        user: {
          select: {
            id: true,
            email: true,
          },
        },
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        eventTypeId: true,
        userPrimaryEmail: true,
        eventType: {
          select: {
            teamId: true,
            parentId: true,
            slug: true,
            hideOrganizerEmail: true,
            customReplyToEmail: true,
            bookingFields: true,
            metadata: true,
            team: {
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            },
          },
        },
        location: true,
        attendees: true,
        references: true,
        customInputs: true,
        dynamicEventSlugRef: true,
        dynamicGroupSlugRef: true,
        destinationCalendar: true,
        smsReminderNumber: true,
        workflowReminders: true,
        responses: true,
        iCalUID: true,
      },
    });
  }

  async updateBookingStatus({
    bookingId,
    status,
    cancellationReason,
    cancelledBy,
    rescheduledBy,
    rescheduled,
  }: {
    bookingId: number;
    status?: BookingStatus;
    cancellationReason?: string;
    cancelledBy?: string;
    rescheduledBy?: string;
    rescheduled?: boolean;
  }) {
    return await this.prismaClient.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        ...(status !== undefined && { status }),
        ...(rescheduled !== undefined && { rescheduled }),
        ...(cancellationReason !== undefined && { cancellationReason }),
        ...(cancelledBy !== undefined && { cancelledBy }),
        ...(rescheduledBy !== undefined && { rescheduledBy }),
        updatedAt: new Date().toISOString(),
      },
    });
  }

  /**
   * Cancels a booking as part of the Managed Event reassignment flow.
   * Callers only pass domain data; repository handles persistence details.
   */
  async cancelBookingForManagedEventReassignment({
    bookingId,
    cancellationReason,
    metadata,
    tx,
  }: {
    bookingId: number;
    cancellationReason: string;
    metadata?: Record<string, unknown> | null;
    tx?: Omit<PrismaClient, "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends">;
  }): Promise<ManagedEventCancellationResult> {
    const client = tx ?? this.prismaClient;
    return client.booking.update({
      where: { id: bookingId },
      data: {
        cancellationReason,
        metadata: metadata as unknown as Prisma.InputJsonValue,
        status: BookingStatus.CANCELLED,
      },
      select: {
        id: true,
        uid: true,
        metadata: true,
        status: true,
      },
    });
  }

  /**
   * Creates a booking specifically for Managed Event reassignment flows.
   * Encapsulates the select shape so callers don't deal with Prisma selections.
   */
  async createBookingForManagedEventReassignment(
    params: ManagedEventReassignmentCreateParams
  ): Promise<ManagedEventReassignmentCreatedBooking> {
    const {
      uid,
      userId,
      userPrimaryEmail,
      title,
      description,
      startTime,
      endTime,
      status,
      location,
      smsReminderNumber,
      responses,
      customInputs,
      metadata,
      idempotencyKey,
      eventTypeId,
      attendees,
      paymentId,
      iCalUID,
      iCalSequence,
      tx,
    } = params;
    const client = tx ?? this.prismaClient;
    return client.booking.create({
      data: {
        uid,
        userPrimaryEmail,
        title,
        description,
        startTime,
        endTime,
        status,
        location,
        smsReminderNumber,
        responses: responses ?? undefined,
        customInputs: (customInputs as unknown as Prisma.InputJsonValue) ?? undefined,
        metadata: (metadata as unknown as Prisma.InputJsonValue) ?? undefined,
        idempotencyKey,
        iCalUID,
        iCalSequence,
        eventType: {
          connect: { id: eventTypeId },
        },
        user: {
          connect: { id: userId },
        },
        attendees: {
          createMany: {
            data: attendees.map((attendee) => ({
              name: attendee.name,
              email: attendee.email,
              timeZone: attendee.timeZone,
              locale: attendee.locale,
              phoneNumber: attendee.phoneNumber ?? null,
            })),
          },
        },
        payment: paymentId ? { connect: { id: paymentId } } : undefined,
      },
      select: {
        id: true,
        uid: true,
        title: true,
        description: true,
        startTime: true,
        endTime: true,
        location: true,
        metadata: true,
        responses: true,
        iCalUID: true,
        iCalSequence: true,
        smsReminderNumber: true,
        attendees: {
          select: {
            name: true,
            email: true,
            timeZone: true,
            locale: true,
          },
          orderBy: {
            id: "asc" as const,
          },
        },
      },
    });
  }

  /**
   * Wraps the cancel+create operations for managed events in a single transaction.
   */
  async managedEventReassignmentTransaction({
    bookingId,
    cancellationReason,
    metadata,
    newBookingPlan,
  }: {
    bookingId: number;
    cancellationReason: string;
    metadata?: Record<string, unknown> | null;
    newBookingPlan: Omit<ManagedEventReassignmentCreateParams, "tx">;
  }): Promise<{
    newBooking: ManagedEventReassignmentCreatedBooking;
    cancelledBooking: ManagedEventCancellationResult;
  }> {
    return this.prismaClient.$transaction(async (tx) => {
      const cancelledBooking = await this.cancelBookingForManagedEventReassignment({
        bookingId,
        cancellationReason,
        metadata,
        tx,
      });

      const newBooking = await this.createBookingForManagedEventReassignment({
        ...newBookingPlan,
        tx,
      });

      return { newBooking, cancelledBooking };
    });
  }

  async findByIdForTargetEventTypeSearch(bookingId: number) {
    return this.prismaClient.booking.findUnique({
      where: { id: bookingId },
      select: {
        eventTypeId: true,
        userId: true,
        startTime: true,
        endTime: true,
      },
    });
  }

  async findByIdForWithUserIdAndEventTypeId(bookingId: number) {
    return this.prismaClient.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        eventTypeId: true,
        userId: true,
      },
    });
  }

  async findByIdForReassignmentValidation(bookingId: number) {
    return this.prismaClient.booking.findUnique({
      where: { id: bookingId },
      select: {
        id: true,
        status: true,
        recurringEventId: true,
        startTime: true,
        endTime: true,
      },
    });
  }

  async findByUidBasic({ bookingUid }: { bookingUid: string }): Promise<BookingBasicDto | null> {
    const booking = await this.prismaClient.booking.findUnique({
      where: {
        uid: bookingUid,
      },
      select: {
        id: true,
        uid: true,
        startTime: true,
        endTime: true,
        description: true,
        status: true,
        paid: true,
        eventTypeId: true,
      },
    });

    if (!booking) return null;

    return {
      id: booking.id,
      uid: booking.uid,
      startTime: booking.startTime,
      endTime: booking.endTime,
      description: booking.description,
      status: booking.status,
      paid: booking.paid,
      eventTypeId: booking.eventTypeId,
    };
  }

  async findAcceptedByIdForInstantBooking({
    bookingId,
  }: {
    bookingId: number;
  }): Promise<BookingInstantLocationDto | null> {
    const booking = await this.prismaClient.booking.findUnique({
      where: {
        id: bookingId,
        status: BookingStatus.ACCEPTED,
      },
      select: {
        id: true,
        uid: true,
        location: true,
        metadata: true,
        startTime: true,
        status: true,
        endTime: true,
        description: true,
        eventTypeId: true,
      },
    });

    if (!booking) return null;

    return {
      id: booking.id,
      uid: booking.uid,
      location: booking.location,
      metadata: booking.metadata as Record<string, unknown> | null,
      startTime: booking.startTime,
      status: booking.status,
      endTime: booking.endTime,
      description: booking.description,
      eventTypeId: booking.eventTypeId,
    };
  }

  async countSeatReferencesByReferenceUid({ referenceUid }: { referenceUid: string }) {
    const bookingSeat = await this.prismaClient.bookingSeat.findUnique({
      where: {
        referenceUid,
      },
      select: {
        booking: {
          select: {
            _count: {
              select: {
                seatsReferences: true,
              },
            },
          },
        },
      },
    });

    if (!bookingSeat) {
      return null;
    }

    return bookingSeat.booking._count.seatsReferences;
  }

  private bookingWithFullContextInclude = {
    attendees: {
      select: {
        id: true,
        email: true,
        name: true,
        timeZone: true,
        locale: true,
        bookingId: true,
        phoneNumber: true,
        noShow: true,
      },
    },
    eventType: {
      select: {
        team: {
          select: {
            id: true,
            name: true,
            parentId: true,
          },
        },
        metadata: true,
        title: true,
        recurringEvent: true,
        seatsPerTimeSlot: true,
        seatsShowAttendees: true,
        hideOrganizerEmail: true,
        customReplyToEmail: true,
      },
    },
    destinationCalendar: {
      select: {
        id: true,
        integration: true,
        externalId: true,
        primaryEmail: true,
        userId: true,
        eventTypeId: true,
        credentialId: true,
        createdAt: true,
        updatedAt: true,
        delegationCredentialId: true,
        domainWideDelegationCredentialId: true,
      },
    },
    references: {
      select: {
        id: true,
        type: true,
        uid: true,
        meetingId: true,
        meetingPassword: true,
        meetingUrl: true,
        bookingId: true,
        externalCalendarId: true,
        deleted: true,
        credentialId: true,
        thirdPartyRecurringEventId: true,
        delegationCredentialId: true,
        domainWideDelegationCredentialId: true,
      },
    },
    user: {
      select: {
        id: true,
        destinationCalendar: {
          select: {
            id: true,
            integration: true,
            externalId: true,
            primaryEmail: true,
            userId: true,
            eventTypeId: true,
            credentialId: true,
            createdAt: true,
            updatedAt: true,
            delegationCredentialId: true,
            domainWideDelegationCredentialId: true,
          },
        },
        credentials: {
          select: {
            id: true,
            type: true,
            // Note: key is intentionally NOT selected to avoid leaking sensitive data
            userId: true,
            teamId: true,
            appId: true,
            subscriptionId: true,
            paymentStatus: true,
            billingCycleStart: true,
            invalid: true,
          },
        },
        profiles: {
          select: {
            organizationId: true,
          },
        },
      },
    },
  } as const;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToBookingFullContextDto(booking: any): BookingFullContextDto {
    return {
      id: booking.id,
      uid: booking.uid,
      userId: booking.userId,
      startTime: booking.startTime,
      endTime: booking.endTime,
      title: booking.title,
      description: booking.description,
      status: booking.status,
      attendees: booking.attendees.map((attendee: {
        id: number;
        email: string;
        name: string;
        timeZone: string;
        locale: string | null;
        bookingId: number | null;
        phoneNumber: string | null;
        noShow: boolean | null;
      }) => ({
        id: attendee.id,
        email: attendee.email,
        name: attendee.name,
        timeZone: attendee.timeZone,
        locale: attendee.locale,
        bookingId: attendee.bookingId,
        phoneNumber: attendee.phoneNumber,
        noShow: attendee.noShow,
      })),
      eventType: booking.eventType
        ? {
            team: booking.eventType.team
              ? {
                  id: booking.eventType.team.id,
                  name: booking.eventType.team.name,
                  parentId: booking.eventType.team.parentId,
                }
              : null,
            metadata: booking.eventType.metadata,
            title: booking.eventType.title,
            recurringEvent: booking.eventType.recurringEvent,
            seatsPerTimeSlot: booking.eventType.seatsPerTimeSlot,
            seatsShowAttendees: booking.eventType.seatsShowAttendees,
            hideOrganizerEmail: booking.eventType.hideOrganizerEmail,
            customReplyToEmail: booking.eventType.customReplyToEmail,
          }
        : null,
      destinationCalendar: booking.destinationCalendar
        ? {
            id: booking.destinationCalendar.id,
            integration: booking.destinationCalendar.integration,
            externalId: booking.destinationCalendar.externalId,
            primaryEmail: booking.destinationCalendar.primaryEmail,
            userId: booking.destinationCalendar.userId,
            eventTypeId: booking.destinationCalendar.eventTypeId,
            credentialId: booking.destinationCalendar.credentialId,
            createdAt: booking.destinationCalendar.createdAt,
            updatedAt: booking.destinationCalendar.updatedAt,
            delegationCredentialId: booking.destinationCalendar.delegationCredentialId,
            domainWideDelegationCredentialId: booking.destinationCalendar.domainWideDelegationCredentialId,
          }
        : null,
      references: booking.references.map((ref: {
        id: number;
        type: string;
        uid: string;
        meetingId: string | null;
        meetingPassword: string | null;
        meetingUrl: string | null;
        bookingId: number | null;
        externalCalendarId: string | null;
        deleted: boolean | null;
        credentialId: number | null;
        thirdPartyRecurringEventId: string | null;
        delegationCredentialId: string | null;
        domainWideDelegationCredentialId: string | null;
      }) => ({
        id: ref.id,
        type: ref.type,
        uid: ref.uid,
        meetingId: ref.meetingId,
        meetingPassword: ref.meetingPassword,
        meetingUrl: ref.meetingUrl,
        bookingId: ref.bookingId,
        externalCalendarId: ref.externalCalendarId,
        deleted: ref.deleted,
        credentialId: ref.credentialId,
        thirdPartyRecurringEventId: ref.thirdPartyRecurringEventId,
        delegationCredentialId: ref.delegationCredentialId,
        domainWideDelegationCredentialId: ref.domainWideDelegationCredentialId,
      })),
      user: booking.user
        ? {
            id: booking.user.id,
            destinationCalendar: booking.user.destinationCalendar
              ? {
                  id: booking.user.destinationCalendar.id,
                  integration: booking.user.destinationCalendar.integration,
                  externalId: booking.user.destinationCalendar.externalId,
                  primaryEmail: booking.user.destinationCalendar.primaryEmail,
                  userId: booking.user.destinationCalendar.userId,
                  eventTypeId: booking.user.destinationCalendar.eventTypeId,
                  credentialId: booking.user.destinationCalendar.credentialId,
                  createdAt: booking.user.destinationCalendar.createdAt,
                  updatedAt: booking.user.destinationCalendar.updatedAt,
                  delegationCredentialId: booking.user.destinationCalendar.delegationCredentialId,
                  domainWideDelegationCredentialId: booking.user.destinationCalendar.domainWideDelegationCredentialId,
                }
              : null,
            credentials: booking.user.credentials.map((cred: {
              id: number;
              type: string;
              userId: number | null;
              teamId: number | null;
              appId: string | null;
              subscriptionId: string | null;
              paymentStatus: string | null;
              billingCycleStart: number | null;
              invalid: boolean | null;
            }) => ({
              id: cred.id,
              type: cred.type,
              userId: cred.userId,
              teamId: cred.teamId,
              appId: cred.appId,
              subscriptionId: cred.subscriptionId,
              paymentStatus: cred.paymentStatus,
              billingCycleStart: cred.billingCycleStart,
              invalid: cred.invalid,
            })),
            profiles: booking.user.profiles.map((profile: { organizationId: number | null }) => ({
              organizationId: profile.organizationId,
            })),
          }
        : null,
      userPrimaryEmail: booking.userPrimaryEmail,
      iCalUID: booking.iCalUID,
      iCalSequence: booking.iCalSequence,
      metadata: booking.metadata,
      responses: booking.responses,
    };
  }

  async findByIdForAdminIncludeFullContext({
    bookingId,
    adminUserId,
  }: {
    bookingId: number;
    adminUserId: number;
  }): Promise<BookingFullContextDto | null> {
    const booking = await this.prismaClient.booking.findFirst({
      where: {
        id: bookingId,
        eventType: {
          team: {
            members: {
              some: {
                userId: adminUserId,
                role: {
                  in: ["ADMIN", "OWNER"],
                },
              },
            },
          },
        },
      },
      include: this.bookingWithFullContextInclude,
    });

    if (!booking) return null;

    return this.mapToBookingFullContextDto(booking);
  }

  async findByIdForOrganizerOrCollectiveMemberIncludeFullContext({
    bookingId,
    userId,
  }: {
    bookingId: number;
    userId: number;
  }): Promise<BookingFullContextDto | null> {
    const booking = await this.prismaClient.booking.findFirst({
      where: {
        id: bookingId,
        AND: [
          {
            OR: [
              { userId },
              {
                eventType: {
                  schedulingType: "COLLECTIVE",
                  users: {
                    some: {
                      id: userId,
                    },
                  },
                },
              },
            ],
          },
        ],
      },
      include: this.bookingWithFullContextInclude,
    });

    if (!booking) return null;

    return this.mapToBookingFullContextDto(booking);
  }

  async findByIdForConfirmation({ bookingId }: { bookingId: number }): Promise<BookingForConfirmationDto> {
    const booking = await this.prismaClient.booking.findUniqueOrThrow({
      where: {
        id: bookingId,
      },
      select: {
        title: true,
        description: true,
        customInputs: true,
        startTime: true,
        endTime: true,
        attendees: true,
        eventTypeId: true,
        responses: true,
        metadata: true,
        userPrimaryEmail: true,
        eventType: {
          select: {
            id: true,
            owner: {
              select: {
                id: true,
                hideBranding: true,
              },
            },
            teamId: true,
            recurringEvent: true,
            title: true,
            slug: true,
            requiresConfirmation: true,
            currency: true,
            length: true,
            description: true,
            price: true,
            bookingFields: true,
            hideOrganizerEmail: true,
            hideCalendarNotes: true,
            hideCalendarEventDetails: true,
            disableGuests: true,
            customReplyToEmail: true,
            metadata: true,
            locations: true,
            team: {
              select: {
                id: true,
                name: true,
                parentId: true,
              },
            },
            workflows: {
              select: {
                workflow: {
                  select: {
                    id: true,
                    userId: true,
                    teamId: true,
                    name: true,
                    trigger: true,
                    time: true,
                    timeUnit: true,
                    activeOn: true,
                    steps: {
                      select: {
                        id: true,
                        stepNumber: true,
                        action: true,
                        workflowId: true,
                        sendTo: true,
                        reminderBody: true,
                        emailSubject: true,
                        template: true,
                        numberRequired: true,
                        sender: true,
                        numberVerificationPending: true,
                        includeCalendarEvent: true,
                      },
                    },
                  },
                },
              },
            },
            customInputs: true,
            parentId: true,
            parent: {
              select: {
                teamId: true,
              },
            },
          },
        },
        location: true,
        userId: true,
        user: {
          select: {
            id: true,
            username: true,
            email: true,
            timeZone: true,
            timeFormat: true,
            name: true,
            destinationCalendar: true,
            locale: true,
          },
        },
        id: true,
        uid: true,
        payment: true,
        destinationCalendar: true,
        paid: true,
        recurringEventId: true,
        status: true,
        smsReminderNumber: true,
      },
    });

    return this.mapToBookingForConfirmationDto(booking);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private mapToBookingForConfirmationDto(booking: any): BookingForConfirmationDto {
    return {
      id: booking.id,
      uid: booking.uid,
      title: booking.title,
      description: booking.description,
      customInputs: booking.customInputs,
      startTime: booking.startTime,
      endTime: booking.endTime,
      attendees: booking.attendees.map((attendee: {
        id: number;
        email: string;
        name: string;
        timeZone: string;
        locale: string | null;
        bookingId: number | null;
        phoneNumber: string | null;
        noShow: boolean | null;
      }) => ({
        id: attendee.id,
        email: attendee.email,
        name: attendee.name,
        timeZone: attendee.timeZone,
        locale: attendee.locale,
        bookingId: attendee.bookingId,
        phoneNumber: attendee.phoneNumber,
        noShow: attendee.noShow,
      })),
      eventTypeId: booking.eventTypeId,
      responses: booking.responses,
      metadata: booking.metadata,
      userPrimaryEmail: booking.userPrimaryEmail,
      eventType: booking.eventType
        ? {
            id: booking.eventType.id,
            owner: booking.eventType.owner
              ? { id: booking.eventType.owner.id, hideBranding: booking.eventType.owner.hideBranding }
              : null,
            teamId: booking.eventType.teamId,
            recurringEvent: booking.eventType.recurringEvent,
            title: booking.eventType.title,
            slug: booking.eventType.slug,
            requiresConfirmation: booking.eventType.requiresConfirmation,
            currency: booking.eventType.currency,
            length: booking.eventType.length,
            description: booking.eventType.description,
            price: booking.eventType.price,
            bookingFields: booking.eventType.bookingFields,
            hideOrganizerEmail: booking.eventType.hideOrganizerEmail,
            hideCalendarNotes: booking.eventType.hideCalendarNotes,
            hideCalendarEventDetails: booking.eventType.hideCalendarEventDetails,
            disableGuests: booking.eventType.disableGuests,
            customReplyToEmail: booking.eventType.customReplyToEmail,
            metadata: booking.eventType.metadata,
            locations: booking.eventType.locations,
            team: booking.eventType.team
              ? {
                  id: booking.eventType.team.id,
                  name: booking.eventType.team.name,
                  parentId: booking.eventType.team.parentId,
                }
              : null,
            workflows: booking.eventType.workflows.map((wf: { workflow: {
              id: number;
              userId: number | null;
              teamId: number | null;
              name: string;
              trigger: string;
              time: number | null;
              timeUnit: string | null;
              activeOn: unknown[];
              steps: {
                id: number;
                stepNumber: number;
                action: string;
                workflowId: number;
                sendTo: string | null;
                reminderBody: string | null;
                emailSubject: string | null;
                template: string;
                numberRequired: boolean | null;
                sender: string | null;
                numberVerificationPending: boolean;
                includeCalendarEvent: boolean;
              }[];
            }}) => ({
              workflow: {
                id: wf.workflow.id,
                name: wf.workflow.name,
                trigger: wf.workflow.trigger,
                time: wf.workflow.time,
                timeUnit: wf.workflow.timeUnit,
                userId: wf.workflow.userId,
                teamId: wf.workflow.teamId,
                steps: wf.workflow.steps.map((step) => ({
                  id: step.id,
                  stepNumber: step.stepNumber,
                  action: step.action,
                  workflowId: step.workflowId,
                  sendTo: step.sendTo,
                  reminderBody: step.reminderBody,
                  emailSubject: step.emailSubject,
                  template: step.template,
                  numberRequired: step.numberRequired,
                  sender: step.sender,
                  numberVerificationPending: step.numberVerificationPending,
                  includeCalendarEvent: step.includeCalendarEvent,
                })),
              },
            })),
            customInputs: booking.eventType.customInputs,
            parentId: booking.eventType.parentId,
            parent: booking.eventType.parent
              ? { teamId: booking.eventType.parent.teamId }
              : null,
          }
        : null,
      location: booking.location,
      userId: booking.userId,
      user: booking.user
        ? {
            id: booking.user.id,
            username: booking.user.username,
            email: booking.user.email,
            timeZone: booking.user.timeZone,
            timeFormat: booking.user.timeFormat,
            name: booking.user.name,
            destinationCalendar: booking.user.destinationCalendar
              ? {
                  id: booking.user.destinationCalendar.id,
                  integration: booking.user.destinationCalendar.integration,
                  externalId: booking.user.destinationCalendar.externalId,
                  primaryEmail: booking.user.destinationCalendar.primaryEmail,
                  userId: booking.user.destinationCalendar.userId,
                  eventTypeId: booking.user.destinationCalendar.eventTypeId,
                  credentialId: booking.user.destinationCalendar.credentialId,
                  createdAt: booking.user.destinationCalendar.createdAt,
                  updatedAt: booking.user.destinationCalendar.updatedAt,
                  delegationCredentialId: booking.user.destinationCalendar.delegationCredentialId,
                  domainWideDelegationCredentialId: booking.user.destinationCalendar.domainWideDelegationCredentialId,
                }
              : null,
            locale: booking.user.locale,
          }
        : null,
      payment: booking.payment.map((p: {
        id: number;
        uid: string;
        appId: string | null;
        bookingId: number;
        amount: number;
        fee: number;
        currency: string;
        success: boolean;
        refunded: boolean;
        data: unknown;
        externalId: string;
        paymentOption: string | null;
      }) => ({
        id: p.id,
        uid: p.uid,
        appId: p.appId,
        bookingId: p.bookingId,
        amount: p.amount,
        fee: p.fee,
        currency: p.currency,
        success: p.success,
        refunded: p.refunded,
        data: p.data,
        externalId: p.externalId,
        paymentOption: p.paymentOption,
      })),
      destinationCalendar: booking.destinationCalendar
        ? {
            id: booking.destinationCalendar.id,
            integration: booking.destinationCalendar.integration,
            externalId: booking.destinationCalendar.externalId,
            primaryEmail: booking.destinationCalendar.primaryEmail,
            userId: booking.destinationCalendar.userId,
            eventTypeId: booking.destinationCalendar.eventTypeId,
            credentialId: booking.destinationCalendar.credentialId,
            createdAt: booking.destinationCalendar.createdAt,
            updatedAt: booking.destinationCalendar.updatedAt,
            delegationCredentialId: booking.destinationCalendar.delegationCredentialId,
            domainWideDelegationCredentialId: booking.destinationCalendar.domainWideDelegationCredentialId,
          }
        : null,
      paid: booking.paid,
      recurringEventId: booking.recurringEventId,
      status: booking.status,
      smsReminderNumber: booking.smsReminderNumber,
    };
  }

  async updateStatusToAccepted({ bookingId }: { bookingId: number }): Promise<BookingUpdateResultDto> {
    const result = await this.prismaClient.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.ACCEPTED,
      },
      select: {
        id: true,
        uid: true,
        status: true,
      },
    });

    return {
      id: result.id,
      uid: result.uid,
      status: result.status,
    };
  }

  async findRecurringEventBookingExists({
    recurringEventId,
    bookingId,
  }: {
    recurringEventId: string;
    bookingId: number;
  }): Promise<BookingExistsDto | null> {
    const booking = await this.prismaClient.booking.findFirst({
      where: {
        recurringEventId,
        id: bookingId,
      },
      select: {
        id: true,
      },
    });

    if (!booking) return null;

    return {
      id: booking.id,
    };
  }

  async countByRecurringEventId({ recurringEventId }: { recurringEventId: string }) {
    const result = await this.prismaClient.booking.groupBy({
      where: {
        recurringEventId,
      },
      by: ["recurringEventId"],
      _count: true,
    });
    return result[0]?._count ?? 0;
  }

  async rejectAllPendingByRecurringEventId({
    recurringEventId,
    rejectionReason,
  }: {
    recurringEventId: string;
    rejectionReason?: string;
  }): Promise<BookingBatchUpdateResultDto> {
    const result = await this.prismaClient.booking.updateMany({
      where: {
        recurringEventId,
        status: BookingStatus.PENDING,
      },
      data: {
        status: BookingStatus.REJECTED,
        rejectionReason,
      },
    });

    return {
      count: result.count,
    };
  }

  async rejectById({
    bookingId,
    rejectionReason,
  }: {
    bookingId: number;
    rejectionReason?: string;
  }): Promise<BookingUpdateResultDto> {
    const result = await this.prismaClient.booking.update({
      where: {
        id: bookingId,
      },
      data: {
        status: BookingStatus.REJECTED,
        rejectionReason,
      },
      select: {
        id: true,
        uid: true,
        status: true,
      },
    });

    return {
      id: result.id,
      uid: result.uid,
      status: result.status,
    };
  }
}
