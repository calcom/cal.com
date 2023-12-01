import type { Prisma } from "@prisma/client";
import type { z } from "zod";

import { bookingResponsesDbSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import slugify from "@calcom/lib/slugify";
import type { PrismaClient } from "@calcom/prisma";
import prisma from "@calcom/prisma";

type BookingSelect = {
  description: true;
  customInputs: true;
  attendees: {
    select: {
      email: true;
      name: true;
    };
  };
  location: true;
};

// Backward Compatibility for booking created before we had managed booking questions
function getResponsesFromOldBooking(
  rawBooking: Prisma.BookingGetPayload<{
    select: BookingSelect;
  }>
) {
  const customInputs = rawBooking.customInputs || {};
  const responses = Object.keys(customInputs).reduce((acc, label) => {
    acc[slugify(label) as keyof typeof acc] = customInputs[label as keyof typeof customInputs];
    return acc;
  }, {});
  return {
    // It is possible to have no attendees in a booking when the booking is cancelled.
    name: rawBooking.attendees[0]?.name || "Nameless",
    email: rawBooking.attendees[0]?.email || "",
    guests: rawBooking.attendees.slice(1).map((attendee) => {
      return attendee.email;
    }),
    notes: rawBooking.description || "",
    location: {
      value: rawBooking.location || "",
      optionValue: rawBooking.location || "",
    },
    ...responses,
  };
}

async function getBooking(prisma: PrismaClient, uid: string) {
  const rawBooking = await prisma.booking.findFirst({
    where: {
      uid,
    },
    select: {
      id: true,
      uid: true,
      startTime: true,
      description: true,
      customInputs: true,
      responses: true,
      smsReminderNumber: true,
      location: true,
      eventTypeId: true,
      attendees: {
        select: {
          email: true,
          name: true,
          bookingSeat: true,
        },
      },
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!rawBooking) {
    return rawBooking;
  }

  const booking = getBookingWithResponses(rawBooking);

  if (booking) {
    // @NOTE: had to do this because Server side cant return [Object objects]
    // probably fixable with json.stringify -> json.parse
    booking["startTime"] = (booking?.startTime as Date)?.toISOString() as unknown as Date;
  }

  return booking;
}

export type GetBookingType = Prisma.PromiseReturnType<typeof getBooking>;

export const getBookingWithResponses = <
  T extends Prisma.BookingGetPayload<{
    select: BookingSelect & {
      responses: true;
    };
  }>
>(
  booking: T
) => {
  return {
    ...booking,
    responses: bookingResponsesDbSchema.parse(booking.responses || getResponsesFromOldBooking(booking)),
  } as Omit<T, "responses"> & { responses: z.infer<typeof bookingResponsesDbSchema> };
};

export default getBooking;

export const getBookingForReschedule = async (uid: string, userId?: number) => {
  let rescheduleUid: string | null = null;
  const theBooking = await prisma.booking.findFirst({
    where: {
      uid,
    },
    select: {
      id: true,
      userId: true,
      eventType: {
        select: {
          seatsPerTimeSlot: true,
          hosts: {
            select: {
              userId: true,
            },
          },
          owner: {
            select: {
              id: true,
            },
          },
        },
      },
    },
  });
  let bookingSeatReferenceUid: number | null = null;

  // If no booking is found via the uid, it's probably a booking seat
  // that its being rescheduled, which we query next.
  let attendeeEmail: string | null = null;
  if (!theBooking) {
    const bookingSeat = await prisma.bookingSeat.findFirst({
      where: {
        referenceUid: uid,
      },
      select: {
        id: true,
        attendee: {
          select: {
            name: true,
            email: true,
          },
        },
        booking: {
          select: {
            uid: true,
          },
        },
      },
    });
    if (bookingSeat) {
      bookingSeatReferenceUid = bookingSeat.id;
      rescheduleUid = bookingSeat.booking.uid;
      attendeeEmail = bookingSeat.attendee.email;
    }
  }

  // If we have the booking and not bookingSeat, we need to make sure the booking belongs to the userLoggedIn
  // Otherwise, we return null here.
  let hasOwnershipOnBooking = false;
  if (theBooking && theBooking?.eventType?.seatsPerTimeSlot && bookingSeatReferenceUid === null) {
    const isOwnerOfBooking = theBooking.userId === userId;

    const isHostOfEventType = theBooking?.eventType?.hosts.some((host) => host.userId === userId);

    const isUserIdInBooking = theBooking.userId === userId;

    if (!isOwnerOfBooking && !isHostOfEventType && !isUserIdInBooking) return null;
    hasOwnershipOnBooking = true;
  }

  // If we don't have a booking and no rescheduleUid, the ID is invalid,
  // and we return null here.
  if (!theBooking && !rescheduleUid) return null;

  const booking = await getBooking(prisma, rescheduleUid || uid);

  if (!booking) return null;

  return {
    ...booking,
    attendees: rescheduleUid
      ? booking.attendees.filter((attendee) => attendee.email === attendeeEmail)
      : hasOwnershipOnBooking
      ? []
      : booking.attendees,
  };
};

/**
 * Should only get booking attendees length for seated events
 * @param uid
 * @returns booking with masked attendee emails
 */
export const getBookingForSeatedEvent = async (uid: string) => {
  const booking = await prisma.booking.findFirst({
    where: {
      uid,
    },
    select: {
      id: true,
      uid: true,
      startTime: true,
      attendees: {
        select: {
          id: true,
        },
      },
      eventTypeId: true,
      user: {
        select: {
          id: true,
        },
      },
    },
  });

  if (!booking || booking.eventTypeId === null) return null;

  // Validate booking event type has seats enabled
  const eventType = await prisma.eventType.findFirst({
    where: {
      id: booking.eventTypeId,
    },
    select: {
      seatsPerTimeSlot: true,
    },
  });
  if (!eventType || eventType.seatsPerTimeSlot === null) return null;

  const result: GetBookingType = {
    ...booking,
    // @NOTE: had to do this because Server side cant return [Object objects]
    startTime: booking.startTime.toISOString() as unknown as Date,
    description: null,
    customInputs: null,
    responses: {},
    smsReminderNumber: null,
    location: null,
    // mask attendee emails for seated events
    attendees: booking.attendees.map((attendee) => ({
      ...attendee,
      email: "",
      name: "",
      bookingSeat: null,
    })),
  };
  return result;
};

export const getMultipleDurationValue = (
  multipleDurationConfig: number[] | undefined,
  queryDuration: string | string[] | undefined,
  defaultValue: number
) => {
  if (!multipleDurationConfig) return null;
  if (multipleDurationConfig.includes(Number(queryDuration))) return Number(queryDuration);
  return defaultValue;
};
