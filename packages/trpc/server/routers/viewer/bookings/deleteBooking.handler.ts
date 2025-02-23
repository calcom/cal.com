import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TDeleteInputSchema } from "./deleteBooking.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteBookingHandler = async ({ ctx, input }: DeleteOptions) => {
  const { user } = ctx;
  const { id } = input;
  await prisma.booking.delete({
    where: {
      userId: user.id,
      id,
    },
  });

  return {
    id,
  };
};
