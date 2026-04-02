import type { PrismaClient } from "@calcom/prisma";
import type { TFindInputSchema } from "./find.schema";

type GetOptions = {
  ctx: {
    prisma: PrismaClient;
  };
  input: TFindInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  const { prisma } = ctx;
  const { bookingUid } = input;

  const booking = await prisma.booking.findUnique({
    where: {
      uid: bookingUid,
    },
    select: {
      id: true,
      uid: true,
      startTime: true,
      endTime: true,
      description: true,
      status: true,
      paid: true,
      eventTypeId: true,
    },
  });

  // Don't leak anything private from the booking
  return {
    booking,
  };
};
