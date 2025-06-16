import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";
import { getDefaultScheduleId } from "./util";

type ListOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
};

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
  } catch (error) {
    defaultScheduleId = null;
  }

  return {
    schedules: schedules.map((schedule) => ({
      ...schedule,
      isDefault: schedule.id === defaultScheduleId,
    })),
  };
};
