import { Prisma, PrismaClient } from "@prisma/client";
import { z } from "zod";

import getBookingResponsesSchema from "@calcom/features/bookings/lib/getBookingResponsesSchema";
import { eventTypeBookingFields } from "@calcom/prisma/zod-utils";

async function getBooking(
  prisma: PrismaClient,
  uid: string,
  eventType: {
    bookingFields: z.infer<typeof eventTypeBookingFields>;
  }
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
    responses: getBookingResponsesSchema(eventType).parse(rawBooking.responses),
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
