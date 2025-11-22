import { hasLockedDefaultAvailabilityRestriction } from "@calcom/lib/lockedDefaultAvailability";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import { getDefaultScheduleId } from "./util";

type ListOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "defaultScheduleId">;
  };
};

export type GetAvailabilityListHandlerReturn = Awaited<ReturnType<typeof listHandler>>;

export const listHandler = async ({ ctx }: ListOptions) => {
  const { user } = ctx;

  const schedules = await prisma.schedule.findMany({
    where: {
      userId: user.id,
    },
    select: {
      id: true,
      name: true,
      availability: true,
      timeZone: true,
    },
    orderBy: {
      id: "asc",
    },
  });

  if (schedules.length === 0) {
    return {
      schedules: [],
    };
  }

  let defaultScheduleId: number | null;
  try {
    defaultScheduleId = await getDefaultScheduleId(user.id, prisma);

    if (!user.defaultScheduleId) {
      await prisma.user.update({
        where: {
          id: user.id,
        },
        data: {
          defaultScheduleId,
        },
      });
    }
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error) {
    defaultScheduleId = null;
  }

  // Check if user has locked default availability restrictions
  const lockedDefaultAvailability = await hasLockedDefaultAvailabilityRestriction(user.id);

  return {
    schedules: schedules.map((schedule) => ({
      ...schedule,
      isDefault: schedule.id === defaultScheduleId,
      lockedDefaultAvailability,
    })),
  };
};
