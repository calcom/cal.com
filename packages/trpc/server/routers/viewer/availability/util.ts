import type { Availability as AvailabilityModel, Schedule as ScheduleModel, User } from "@prisma/client";

import type { PrismaClient } from "@calcom/prisma/client";
import type { Schedule } from "@calcom/types/schedule";

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

  return defaultSchedule?.id; // TODO: Handle no schedules AT ALL
};

export const hasDefaultSchedule = async (user: Partial<User>, prisma: PrismaClient) => {
  const defaultSchedule = await prisma.schedule.findFirst({
    where: {
      userId: user.id,
    },
  });
  return !!user.defaultScheduleId || !!defaultSchedule;
};

export const convertScheduleToAvailability = (
  schedule: Partial<ScheduleModel> & { availability: AvailabilityModel[] }
) => {
  return schedule.availability.reduce(
    (schedule: Schedule, availability) => {
      availability.days.forEach((day) => {
        schedule[day].push({
          start: new Date(
            Date.UTC(
              new Date().getUTCFullYear(),
              new Date().getUTCMonth(),
              new Date().getUTCDate(),
              availability.startTime.getUTCHours(),
              availability.startTime.getUTCMinutes()
            )
          ),
          end: new Date(
            Date.UTC(
              new Date().getUTCFullYear(),
              new Date().getUTCMonth(),
              new Date().getUTCDate(),
              availability.endTime.getUTCHours(),
              availability.endTime.getUTCMinutes()
            )
          ),
        });
      });
      return schedule;
    },
    Array.from([...Array(7)]).map(() => [])
  );
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
