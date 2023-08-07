import { sendDigestEmail } from "@calcom/emails";
import { getTranslation } from "@calcom/lib/server/i18n";
import { BookingStatus, type PrismaClient } from "@calcom/prisma/client";

import type { TSendDigestInputSchema } from "./sendDigest.schema";

interface SendDigestOptions {
  ctx: {
    prisma: PrismaClient;
  };
  input: TSendDigestInputSchema;
}

export const sendDigestHandler = async ({ ctx, input }: SendDigestOptions) => {
  console.log("=======triggered digest handler===============");
  const { prisma } = ctx;
  const { startTime, endTime, userId } = input;

  const user = await prisma.user.findUniqueOrThrow({
    where: {
      id: userId,
    },
    select: {
      email: true,
      username: true,
      locale: true,
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

  console.log(startTime, endTime, userId);
  console.log(bookings);

  const hostedEvents: Map<string, eventHostedForInsights> = new Map();
  const attendedEvents: Map<string, eventAttendedForInsights> = new Map();
  let totalHostedEvents = 0;
  let totalAttendedEvents = 0;
  let totalHostedEventsDuration = 0;
  let totalAttendedEventsDuration = 0;
  const uniqueBookedUsers: Set<string> = new Set();
  const uniqueBookedTimeZones: Set<string> = new Set();
  const paymentsMap: Map<string, number> = new Map();
  bookings.forEach((booking) => {
    const duration = new Date(booking.endTime).getTime() - new Date(booking.startTime).getTime();
    const eventTitleOrBookingTitle = booking.eventType?.title || booking.title;
    if (
      booking.userId === userId ||
      booking.eventType?.owner?.id === userId ||
      booking.eventType?.users.map((user) => user.id).includes(userId)
    ) {
      const hostedEvent = hostedEvents.get(eventTitleOrBookingTitle);
      totalHostedEvents += 1;
      totalHostedEventsDuration += duration;

      const payments =
        (booking.paid && booking.payment.filter((payment) => payment.success && !payment.refunded)) || [];

      console.log("success payment", payments, booking.payment[0], booking.paid);

      payments.forEach((payment) => {
        const { currency, fee, amount } = payment;
        const paymentInMap = paymentsMap.get(currency);
        if (!paymentInMap) {
          paymentsMap.set(currency, amount - fee);
        } else {
          paymentsMap.set(currency, paymentInMap + amount - fee);
        }
      });

      console.log("paymentMap", paymentsMap);

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
          uniqueBookedUsers.add(attendee.email);
          uniqueBookedTimeZones.add(attendee.timeZone);
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
          earnings: [...hostedEvent.earnings, ...payments],
          uniqueLocales: new Set([...Array.from(hostedEvent.uniqueLocales), ...Array.from(localeSet)]),
          uniqueUsers: new Set([...Array.from(hostedEvent.uniqueUsers), ...Array.from(emailSet)]),
          uniqueTimeZones: new Set([...Array.from(hostedEvent.uniqueTimeZones), ...Array.from(timeZoneSet)]),
        };
      } else {
        hostedEventToBeAdded = {
          eventTypeTitle: booking.eventType?.title || booking.title,
          duration: duration,
          bookings: 1,
          earnings: payments,
          uniqueUsers: emailSet,
          uniqueLocales: localeSet,
          uniqueTimeZones: timeZoneSet,
        };
      }

      hostedEvents.set(eventTitleOrBookingTitle, hostedEventToBeAdded);
    } else {
      const attendedEvent = attendedEvents.get(eventTitleOrBookingTitle);
      totalAttendedEvents += 1;
      totalAttendedEventsDuration += duration;
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
      attendedEvents.set(eventTitleOrBookingTitle, attendedEventToBeAdded);
    }
  });

  const hostedEventsArray: eventHostedForInsights[] = Array.from(hostedEvents.values());
  console.log("hsotedEventsArray", hostedEventsArray);
  const topBookedEvents: [string, number][] = hostedEventsArray
    .sort((a, b) => -a.bookings + b.bookings)
    .slice(0, 5)
    .map((event) => [event.eventTypeTitle, event.bookings]);
  console.log("topBookedEvents", topBookedEvents);
  const translation = await getTranslation(user.locale ?? "en", "common");

  await sendDigestEmail({
    language: translation,
    user: {
      email: user.email,
    },
    totalHostedEvents,
    totalHostedEventsDuration,
    totalAttendedEvents,
    totalAttendedEventsDuration,
    topBookedEvents,
    paymentsMap,
    uniqueBookedUsers,
    uniqueBookedTimeZones,
  });
  return { ok: true };
};
