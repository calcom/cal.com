import { getBookingRepository } from "@calcom/features/di/containers/Booking";

import type { TGetBookingAttendeesInputSchema } from "./getBookingAttendees.schema";

type GetBookingAttendeesOptions = {
  ctx: Record<string, unknown>;
  input: TGetBookingAttendeesInputSchema;
};

export const getBookingAttendeesHandler = async ({ ctx: _ctx, input }: GetBookingAttendeesOptions) => {
  const bookingRepository = getBookingRepository();
  const count = await bookingRepository.countSeatReferencesByReferenceUid({
    referenceUid: input.seatReferenceUid,
  });

  if (count === null) {
    throw new Error("Booking not found");
  }

  return count;
};
