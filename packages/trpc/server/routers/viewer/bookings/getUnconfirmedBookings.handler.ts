import type { PrismaClient } from "@calcom/prisma";

type GetOptions = {
  ctx: {
    prisma: PrismaClient;
  };
};

export const getHandler = async ({ ctx }: GetOptions) => {
  const { prisma, user } = ctx;

  const bookings = await prisma.booking.findMany({
    where: {
      userId: user.id,
      status: "PENDING",
    },
    select: {
      id: true,
      uid: true,
      startTime: true,
      endTime: true,
      title: true,
      description: true,
      status: true,
      paid: true,
      eventTypeId: true,
    },
  });

  // Don't leak anything private from the booking
  return bookings;
};
