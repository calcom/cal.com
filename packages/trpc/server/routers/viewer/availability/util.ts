import type { User } from "@prisma/client";

import type { PrismaClient } from "@calcom/prisma";

export const getDefaultScheduleId = async (userId: number, prisma: PrismaClient) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      defaultScheduleId: true,
    },
  });

  if (user?.defaultScheduleId) {
    return user.defaultScheduleId;
  }

  // If we're returning the default schedule for the first time then we should set it in the user record
  const defaultSchedule = await prisma.schedule.findFirst({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!defaultSchedule) {
    // Handle case where defaultSchedule is null by throwing an error
    throw new Error("No schedules found for user");
  }

  return defaultSchedule.id;
};

export const hasDefaultSchedule = async (user: Partial<User>, prisma: PrismaClient) => {
  const defaultSchedule = await prisma.schedule.findFirst({
    where: {
      userId: user.id,
    },
  });
  return !!user.defaultScheduleId || !!defaultSchedule;
};

export const setupDefaultSchedule = async (userId: number, scheduleId: number, prisma: PrismaClient) => {
  return prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      defaultScheduleId: scheduleId,
    },
  });
};
