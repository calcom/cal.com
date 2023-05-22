import { prisma } from "@calcom/prisma";

import type { TGetBookingAttendeesInputSchema } from "./getBookingAttendees.schema";

type GetBookingAttendeesOptions = {
  ctx: Record<string, unknown>;
  input: TGetBookingAttendeesInputSchema;
};

export const getBookingAttendeesHandler = async ({ ctx: _ctx, input }: GetBookingAttendeesOptions) => {
  const bookingSeat = await prisma.bookingSeat.findUniqueOrThrow({
    where: {
      referenceUid: input.seatReferenceUid,
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
    throw new Error("Booking not found");
  }

  return bookingSeat.booking._count.seatsReferences;
};
