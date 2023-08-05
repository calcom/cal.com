import { BookingStatus, type PrismaClient } from "@calcom/prisma/client";

import type { TGetDigestInputSchema } from "./getDigest.schema";

interface GetDigestOptions {
  ctx: {
    prisma: PrismaClient;
  };
  input: TGetDigestInputSchema;
}

export const getDigestHandler = async ({ ctx, input }: GetDigestOptions) => {
  const { prisma } = ctx;
  const { startTime, endTime, userId } = input;

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: {
      email: true,
    },
  });

  const sharedQuery = {
    startTime: { gte: new Date(startTime) },
    endTime: { lte: new Date(endTime) },
    status: {
      in: [BookingStatus.ACCEPTED],
    },
  };
  const bookings = await prisma.booking.findMany({
    where: {
      OR: [
        { ...sharedQuery, userId },
        {
          ...sharedQuery,
          attendees: {
            some: {
              email: user.email,
            },
          },
        },
      ],
    },
    select: {
      id: true,
      startTime: true,
      endTime: true,
      title: true,
      paid: true,
      userId: true,
      user: {
        select: {
          email: true,
        },
      },
      eventTypeId: true,
      attendees: {
        select: {
          timeZone: true,
          locale: true,
          email: true,
        },
      },
      payment: {
        select: {
          refunded: true,
          amount: true,
          currency: true,
          success: true,
          fee: true,
        },
      },
      eventType: {
        select: {
          id: true,
          title: true,
          owner: {
            select: {
              id: true,
              email: true,
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

  type eventHostedForInsights = {
    eventTypeTitle: string;
    duration: number;
    bookings: number;
    earnings: {
      refunded: boolean;
      amount: number;
      currency: string;
      success: boolean;
      fee: number;
    }[];
    uniqueUsers: Set<string>;
    uniqueLocales: Set<string>;
    uniqueTimeZones: Set<string>;
  };

  type eventAttendedForInsights = {
    eventTypeTitle: string;
    duration: number;
    bookings: number;
  };

  const hostedEvents: Record<number | string, eventHostedForInsights> = {};
  const attendedEvents: Record<number | string, eventAttendedForInsights> = {};
  bookings.forEach((booking) => {
    const duration = new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime();
    const eventIdOrBookingTitle = booking.eventTypeId || booking.title;
    if (
      booking.userId === userId ||
      booking.eventType?.owner?.id === userId ||
      booking.eventType?.users.map((user) => user.id).includes(userId)
    ) {
      const hostedEvent = hostedEvents[eventIdOrBookingTitle];

      const payment =
        (booking.paid && booking.payment.filter((payment) => payment.success && !payment.refunded)) || [];

      const timeZoneSet: Set<string> = new Set();
      const emailSet: Set<string> = new Set();
      const localeSet: Set<string> = new Set();
      booking.attendees
        .filter(
          (attendee) =>
            attendee.email !== user.email &&
            booking.eventType?.owner?.email !== attendee.email &&
            !booking.eventType?.users.map((user) => user.email).includes(attendee.email)
        )
        .forEach((attendee) => {
          timeZoneSet.add(attendee.timeZone);
          emailSet.add(attendee.email);
          attendee.locale && localeSet.add(attendee.locale);
        });

      let hostedEventToBeAdded: eventHostedForInsights;

      if (hostedEvent) {
        hostedEventToBeAdded = {
          ...hostedEvent,
          bookings: hostedEvent.bookings + 1,
          duration: hostedEvent.duration + duration,
          earnings: [...hostedEvent.earnings, ...payment],
          uniqueLocales: new Set([...Array.from(hostedEvent.uniqueLocales), ...Array.from(localeSet)]),
          uniqueUsers: new Set([...Array.from(hostedEvent.uniqueUsers), ...Array.from(emailSet)]),
          uniqueTimeZones: new Set([...Array.from(hostedEvent.uniqueTimeZones), ...Array.from(timeZoneSet)]),
        };
      } else {
        hostedEventToBeAdded = {
          eventTypeTitle: booking.eventType?.title || booking.title,
          duration: duration,
          bookings: 1,
          earnings: payment,
          uniqueUsers: emailSet,
          uniqueLocales: localeSet,
          uniqueTimeZones: timeZoneSet,
        };
      }

      hostedEvents[eventIdOrBookingTitle] = hostedEventToBeAdded;
    } else {
      const attendedEvent = attendedEvents[eventIdOrBookingTitle];
      let attendedEventToBeAdded: eventAttendedForInsights;
      if (attendedEvent) {
        attendedEventToBeAdded = {
          ...attendedEvent,
          duration: attendedEvent.duration + duration,
          bookings: attendedEvent.bookings + 1,
        };
      } else {
        attendedEventToBeAdded = {
          eventTypeTitle: booking.eventType?.title || booking.title,
          duration,
          bookings: 1,
        };
      }
      attendedEvents[eventIdOrBookingTitle] = attendedEventToBeAdded;
    }
  });

  return { hostedEvents, attendedEvents };
};
