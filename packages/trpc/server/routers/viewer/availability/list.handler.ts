import { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

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
    const scheduleRepository = new ScheduleRepository(prisma);
    defaultScheduleId = await scheduleRepository.getDefaultScheduleId(user.id);

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

  return {
    schedules: schedules.map((schedule) => ({
      ...schedule,
      isDefault: schedule.id === defaultScheduleId,
    })),
  };
};
