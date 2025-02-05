import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TDeletePastBookingsSchema } from "./deletePastBookings.schema";

type DeletePastBookingsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeletePastBookingsSchema;
};

export const deletePastBookingsHandler = async ({ ctx, input }: DeletePastBookingsOptions) => {
  const { user } = ctx;
  const { bookingIds } = input;

  const result = await prisma.booking.deleteMany({
    where: {
      id: { in: bookingIds },
      OR: [
        { userId: user.id },
        {
          attendees: {
            some: { email: user.email },
          },
        },
      ],
      status: { notIn: ["CANCELLED", "REJECTED"] },
      endTime: { lt: new Date() },
    },
  });

  return {
    count: result.count,
    message: `${result.count} bookings deleted successfully`,
  };
};
