import { getBookingRepository } from "@calcom/features/di/containers/Booking";

import type { TInstantBookingInputSchema } from "./getInstantBookingLocation.schema";

type GetOptions = {
  ctx: Record<string, unknown>;
  input: TInstantBookingInputSchema;
};

export const getHandler = async ({ ctx: _ctx, input }: GetOptions) => {
  const { bookingUid } = input;

  const bookingRepository = getBookingRepository();
  const booking = await bookingRepository.findAcceptedByUidForInstantBooking({ bookingUid });

  // Don't leak anything private from the booking
  return {
    booking,
  };
};
