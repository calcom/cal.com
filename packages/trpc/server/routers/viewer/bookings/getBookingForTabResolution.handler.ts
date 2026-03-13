import { BookingDetailsService } from "@calcom/features/bookings/services/BookingDetailsService";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import type { TGetBookingForTabResolutionInputSchema } from "./getBookingForTabResolution.schema";

type GetBookingForTabResolutionOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetBookingForTabResolutionInputSchema;
};

export const getBookingForTabResolutionHandler = async ({
  ctx,
  input,
}: GetBookingForTabResolutionOptions) => {
  const bookingDetailsService = new BookingDetailsService(prisma);

  return await bookingDetailsService.getBookingForTabResolution({
    userId: ctx.user.id,
    bookingUid: input.uid,
  });
};
