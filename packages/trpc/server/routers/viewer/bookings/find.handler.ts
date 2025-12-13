import { getBookingRepository } from "@calcom/features/di/containers/Booking";

import type { TFindInputSchema } from "./find.schema";

type GetOptions = {
  ctx: Record<string, unknown>;
  input: TFindInputSchema;
};

export const getHandler = async ({ ctx: _ctx, input }: GetOptions) => {
  const { bookingUid } = input;

  if (!bookingUid) {
    return {
      booking: null,
    };
  }

  const bookingRepository = getBookingRepository();
  const booking = await bookingRepository.findByUidBasic({ bookingUid });

  // Don't leak anything private from the booking
  return {
    booking,
  };
};
