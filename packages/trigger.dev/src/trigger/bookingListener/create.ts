import { logger } from "@trigger.dev/sdk/v3";
import z from "zod";

import BookingListener from "@calcom/features/bookings/listener/bookingListener";
import generateBookingCreatedParams from "@calcom/features/bookings/listener/lib/bookingCreated/generateBookingCreatedParams";

export const bookingListenerCreateSchema = z.object({
  bookingId: z.number(),
});

export const createTask = async (payload: any) => {
  const { bookingId } = bookingListenerCreateSchema.parse(payload);

  // logger.log("This triggers", payload);
  const bookingCreatedParams = await generateBookingCreatedParams({ bookingId });
  logger.log("bookingCreatedParams", bookingCreatedParams);
  await BookingListener.create(bookingCreatedParams);

  return {
    message: "Run successfully",
  };
};
