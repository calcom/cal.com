import { prisma } from "@calcom/prisma";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

type GetTravelSchedulesOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

export const getTravelSchedulesHandler = async ({ ctx }: GetTravelSchedulesOptions) => {
  const allTravelSchedules = await prisma.travelSchedule.findMany({
    where: {
      userId: ctx.user.id,
    },
    select: {
      id: true,
      startDate: true,
      endDate: true,
      timeZone: true,
    },
  });

  return allTravelSchedules;
};
