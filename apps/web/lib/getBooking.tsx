import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

import { getBookingResponsesPartialSchema } from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import slugify from "@calcom/lib/slugify";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

// Backward Compatibility for booking created before we had managed booking questions
function getResponsesFromOldBooking(
  rawBooking: Prisma.BookingGetPayload<{
    select: {
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
  }>
) {
  const customInputs = rawBooking.customInputs || {};
  const responses = Object.keys(customInputs).reduce((acc, key) => {
    acc[slugify(key) as keyof typeof acc] = customInputs[key as keyof typeof customInputs];
    return acc;
  }, {});
  return {
    name: rawBooking.attendees[0].name,
    email: rawBooking.attendees[0].email,
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
        },
      },
    },
  });

  if (!rawBooking) {
    return rawBooking;
  }
  const booking = {
    ...rawBooking,
    responses: getBookingResponsesPartialSchema({
      bookingFields,
    }).parse(rawBooking.responses || getResponsesFromOldBooking(rawBooking)),
  };

  if (booking) {
    // @NOTE: had to do this because Server side cant return [Object objects]
    // probably fixable with json.stringify -> json.parse
    booking["startTime"] = (booking?.startTime as Date)?.toISOString() as unknown as Date;
  }

  return booking;
}

export type GetBookingType = Prisma.PromiseReturnType<typeof getBooking>;

export default getBooking;
