import type { PrismaClient } from "@prisma/client";

import { prisma } from "@calcom/prisma";

import type { TBookingInputSchema } from "./booking.schema";

interface BookingHandlerOptions {
  ctx: { prisma: PrismaClient };
  input: TBookingInputSchema;
}

export const bookingHandler = async ({ ctx, input }: BookingHandlerOptions) => {
  const booking = await prisma.booking.findFirst({
    where: {
      uid: input.bookingUid,
    },
    select: {
      eventType: {
        select: {
          seatsPerTimeSlot: true,
        },
      },
      _count: {
        select: {
          attendees: true,
        },
      },
    },
  });
  return booking;
};
