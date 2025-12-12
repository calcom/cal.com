import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { prisma } from "@calcom/prisma";

import type { TInstantBookingInputSchema } from "./getInstantBookingLocation.schema";

type GetOptions = {
  ctx: Record<string, unknown>;
  input: TInstantBookingInputSchema;
};

export const getHandler = async ({ ctx: _ctx, input }: GetOptions) => {
  const { bookingId } = input;

  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.findAcceptedByIdForInstantBooking({ bookingId });

  // Don't leak anything private from the booking
  return {
    booking,
  };
};
