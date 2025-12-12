import { BookingRepository } from "@calcom/features/bookings/repositories/BookingRepository";
import { prisma } from "@calcom/prisma";

import type { TFindInputSchema } from "./find.schema";

type GetOptions = {
  ctx: Record<string, unknown>;
  input: TFindInputSchema;
};

export const getHandler = async ({ ctx: _ctx, input }: GetOptions) => {
  const { bookingUid } = input;

  const bookingRepository = new BookingRepository(prisma);
  const booking = await bookingRepository.findByUidBasic({ bookingUid });

  // Don't leak anything private from the booking
  return {
    booking,
  };
};
