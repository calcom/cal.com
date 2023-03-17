import type { Prisma, PrismaClient } from "@prisma/client";
import type { z } from "zod";

import { getBookingResponsesPartialSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import slugify from "@calcom/lib/slugify";
import type { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

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
  smsReminderNumber: true;
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

async function getBooking(
  prisma: PrismaClient,
  uid: string,
  bookingFields: z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">
) {
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

  const booking = getBookingWithResponses(rawBooking, {
    bookingFields,
  });

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
  booking: T,
  eventType: {
    bookingFields: z.infer<typeof eventTypeBookingFields> & z.BRAND<"HAS_SYSTEM_FIELDS">;
  }
) => {
  return {
    ...booking,
    responses: getBookingResponsesPartialSchema({
      eventType: {
        bookingFields: eventType.bookingFields,
      },
      // An existing booking can have data from any number of views, so the schema should consider ALL_VIEWS
      view: "ALL_VIEWS",
    }).parse(booking.responses || getResponsesFromOldBooking(booking)),
  };
};
export default getBooking;
