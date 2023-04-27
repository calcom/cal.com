import { BookingStatus } from "@prisma/client";

import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type BookingUnconfirmedCountOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const bookingUnconfirmedCountHandler = async ({ ctx }: BookingUnconfirmedCountOptions) => {
  const { user } = ctx;
  const count = await prisma.booking.count({
    where: {
      status: BookingStatus.PENDING,
      userId: user.id,
      endTime: { gt: new Date() },
    },
  });
  const recurringGrouping = await prisma.booking.groupBy({
    by: ["recurringEventId"],
    _count: {
      recurringEventId: true,
    },
    where: {
      recurringEventId: { not: { equals: null } },
      status: { equals: "PENDING" },
      userId: user.id,
      endTime: { gt: new Date() },
    },
  });
  return recurringGrouping.reduce((prev, current) => {
    // recurringEventId is the total number of recurring instances for a booking
    // we need to subtract all but one, to represent a single recurring booking
    return prev - (current._count?.recurringEventId - 1);
  }, count);
};
