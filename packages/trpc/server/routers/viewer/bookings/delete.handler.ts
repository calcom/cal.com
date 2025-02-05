import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TDeleteInputSchema } from "./delete.schema";

type DeleteOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TDeleteInputSchema;
};

export const deleteHandler = async ({ ctx, input }: DeleteOptions) => {
  const { id } = input;
  const { user } = ctx;

  const booking = await prisma.booking.findFirst({
    where: {
      id: id,
      OR: [
        {
          userId: user.id,
        },
        {
          attendees: {
            some: {
              email: user.email,
            },
          },
        },
      ],
    },
    include: {
      attendees: true,
      references: true,
      payment: true,
      workflowReminders: true,
    },
  });

  if (!booking) {
    throw new Error("Booking not found");
  }

  await prisma.booking.delete({
    where: {
      id: booking.id,
    },
  });

  return {
    message: "Booking deleted successfully",
  };
};
