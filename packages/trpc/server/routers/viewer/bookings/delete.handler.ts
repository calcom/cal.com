import { prisma } from "@calcom/prisma";

import type { ZDeleteBookingInputSchema } from "./delete.schema";
import type { BookingsProcedureContext } from "./util";

type DeleteOptions = {
  ctx: BookingsProcedureContext;
  input: ZDeleteBookingInputSchema;
};

export async function deleteHandler({ ctx }: DeleteOptions) {
  // Soft delete: mark as cancelled and set deleted flag
  const { booking } = ctx;

  // Check if booking is in the past
  if (booking.endTime > new Date()) {
    throw new Error("Cannot delete future bookings");
  }

  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      deleted: true,
    },
  });

  return { message: "Booking deleted" };
}
