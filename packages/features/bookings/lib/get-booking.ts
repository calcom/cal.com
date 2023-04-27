import type { Prisma, PrismaClient } from "@prisma/client";
import type { z } from "zod";

import { bookingResponsesDbSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import slugify from "@calcom/lib/slugify";
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

export const getBookingByUidOrRescheduleUid = async (uid: string) => {
  let eventTypeId: number | null = null;
  let rescheduleUid: string | null = null;
  eventTypeId =
    (
      await prisma.booking.findFirst({
        where: {
          uid,
        },
        select: {
          eventTypeId: true,
        },
      })
    )?.eventTypeId || null;

  // If no booking is found via the uid, it's probably a booking seat,
  // which we query next.
  let attendeeEmail: string | null = null;
  if (!eventTypeId) {
    const bookingSeat = await prisma.bookingSeat.findFirst({
      where: {
        referenceUid: uid,
      },
      select: {
        id: true,
        attendee: true,
        booking: {
          select: {
            uid: true,
          },
        },
      },
    });
    if (bookingSeat) {
      rescheduleUid = bookingSeat.booking.uid;
      attendeeEmail = bookingSeat.attendee.email;
    }
  }

  // If we don't have a booking and no rescheduleUid, the ID is invalid,
  // and we return null here.
  if (!eventTypeId && !rescheduleUid) return null;

  const booking = await getBooking(prisma, rescheduleUid || uid);

  if (!booking) return null;

  return {
    ...booking,
    attendees: rescheduleUid
      ? booking.attendees.filter((attendee) => attendee.email === attendeeEmail)
      : booking.attendees,
  };
};
