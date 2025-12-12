import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { prisma } from "@calcom/prisma";

import type { TGetBookingAttendeesInputSchema } from "./getBookingAttendees.schema";

type GetBookingAttendeesOptions = {
  ctx: Record<string, unknown>;
  input: TGetBookingAttendeesInputSchema;
};

export const getBookingAttendeesHandler = async ({ ctx: _ctx, input }: GetBookingAttendeesOptions) => {
  const bookingRepository = new BookingRepository(prisma);
  const count = await bookingRepository.countSeatReferencesByReferenceUid({
    referenceUid: input.seatReferenceUid,
  });

  if (count === null) {
    throw new Error("Booking not found");
  }

  return count;
};
