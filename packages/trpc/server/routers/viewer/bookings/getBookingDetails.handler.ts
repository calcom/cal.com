import { BookingDetailsService } from "@calcom/features/bookings/services/BookingDetailsService";
import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "../../../types";
import type { TGetBookingDetailsInputSchema } from "./getBookingDetails.schema";

type GetBookingDetailsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetBookingDetailsInputSchema;
};

export const getBookingDetailsHandler = async ({ ctx, input }: GetBookingDetailsOptions) => {
  const bookingDetailsService = new BookingDetailsService(prisma);

  return await bookingDetailsService.getBookingDetails({
    userId: ctx.user.id,
    bookingUid: input.uid,
  });
};
