import { Availability as AvailabilityModel, Prisma, Schedule as ScheduleModel, User } from "@prisma/client";
import { z } from "zod";

import { getUserAvailability } from "@calcom/core/getUserAvailability";
import { getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { PrismaClient } from "@calcom/prisma/client";
import { stringOrNumber } from "@calcom/prisma/zod-utils";
import { Schedule } from "@calcom/types/schedule";

import { TRPCError } from "@trpc/server";

import { createProtectedRouter } from "../../createRouter";

export const availabilityRouter = createProtectedRouter()
  .query("list", {
    async resolve({ ctx }) {
      const { prisma, user } = ctx;
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
      return {
        schedules: schedules.map((schedule) => ({
          ...schedule,
          isDefault: user.defaultScheduleId === schedule.id || schedules.length === 1,
        })),
      };
    },
  })
  .query("schedule", {
    input: z.object({
      scheduleId: z.number(),
    }),
    async resolve({ ctx, input }) {
      const { prisma, user } = ctx;
      const schedule = await prisma.schedule.findUnique({
        where: {
          id: input.scheduleId,
        },
        select: {
          id: true,
          userId: true,
          name: true,
          availability: true,
          timeZone: true,
          eventType: {
            select: {
              _count: true,
              id: true,
              eventName: true,
            },
          },
        },
      });
      if (!schedule || schedule.userId !== user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }
      const availability = convertScheduleToAvailability(schedule);
      return {
        schedule,
        availability,
        timeZone: schedule.timeZone || user.timeZone,
        isDefault: !user.defaultScheduleId || user.defaultScheduleId === schedule.id,
      };
    },
  })
  .query("user", {
    input: z.object({
      username: z.string(),
      dateFrom: z.string(),
      dateTo: z.string(),
      eventTypeId: stringOrNumber.optional(),
      withSource: z.boolean().optional(),
    }),
    async resolve({ input }) {
      return getUserAvailability(input);
    },
  })
  .mutation("schedule.create", {
    input: z.object({
      name: z.string(),
      copyScheduleId: z.number().optional(),
      schedule: z
        .array(
          z.array(
            z.object({
              start: z.date(),
              end: z.date(),
            })
          )
        )
        .optional(),
    }),
    async resolve({ input, ctx }) {
      const { user, prisma } = ctx;
      const data: Prisma.ScheduleCreateInput = {
        name: input.name,
        user: {
          connect: {
            id: user.id,
          },
        },
      };

      if (input.schedule) {
        const availability = getAvailabilityFromSchedule(input.schedule);
        data.availability = {
          createMany: {
            data: availability.map((schedule) => ({
              days: schedule.days,
              startTime: schedule.startTime,
              endTime: schedule.endTime,
            })),
          },
        };
      }
      const schedule = await prisma.schedule.create({
        data,
      });
      const hasDefaultScheduleId = await hasDefaultSchedule(user, prisma);

      if (hasDefaultScheduleId) {
        await setupDefaultSchedule(user.id, schedule.id, prisma);
      }

      return { schedule };
    },
  })
  .mutation("schedule.delete", {
    input: z.object({
      scheduleId: z.number(),
    }),
    async resolve({ input, ctx }) {
      const { user, prisma } = ctx;

      const scheduleToDelete = await prisma.schedule.findFirst({
        where: {
          id: input.scheduleId,
        },
        select: {
          userId: true,
        },
      });

      if (scheduleToDelete?.userId !== user.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      if (user.defaultScheduleId === input.scheduleId) {
        // unset default
        await prisma.user.update({
          where: {
            id: user.id,
          },
          data: {
            defaultScheduleId: undefined,
          },
        });
      }
      await prisma.schedule.delete({
        where: {
          id: input.scheduleId,
        },
      });
    },
  })
  .mutation("schedule.update", {
    input: z.object({
      scheduleId: z.number(),
      timeZone: z.string().optional(),
      name: z.string().optional(),
      isDefault: z.boolean().optional(),
      schedule: z.array(
        z.array(
          z.object({
            start: z.date(),
            end: z.date(),
          })
        )
      ),
    }),
    async resolve({ input, ctx }) {
      const { user, prisma } = ctx;
      const availability = getAvailabilityFromSchedule(input.schedule);

      if (input.isDefault) {
        setupDefaultSchedule(user.id, input.scheduleId, prisma);
      }

      // Not able to update the schedule with userId where clause, so fetch schedule separately and then validate
      // Bug: https://github.com/prisma/prisma/issues/7290
      const userSchedule = await prisma.schedule.findUnique({
        where: {
          id: input.scheduleId,
        },
        select: {
          userId: true,
        },
      });

      if (userSchedule?.userId !== user.id) throw new TRPCError({ code: "UNAUTHORIZED" });

      if (!userSchedule || userSchedule.userId !== user.id) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
        });
      }

      const schedule = await prisma.schedule.update({
        where: {
          id: input.scheduleId,
        },
        data: {
          timeZone: input.timeZone,
          name: input.name,
          availability: {
            deleteMany: {
              scheduleId: {
                equals: input.scheduleId,
              },
            },
            createMany: {
              data: availability.map((schedule) => ({
                days: schedule.days,
                startTime: schedule.startTime,
                endTime: schedule.endTime,
              })),
            },
          },
        },
      });

      return {
        schedule,
      };
    },
  });

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

const setupDefaultSchedule = async (userId: number, scheduleId: number, prisma: PrismaClient) => {
  await prisma.user.update({
    where: {
      id: userId,
    },
    data: {
      defaultScheduleId: scheduleId,
    },
  });
};

const isDefaultSchedule = (scheduleId: number, user: Partial<User>) => {
  return !user.defaultScheduleId || user.defaultScheduleId === scheduleId;
};

const hasDefaultSchedule = async (user: Partial<User>, prisma: PrismaClient) => {
  const defaultSchedule = await prisma.schedule.findFirst({
    where: {
      userId: user.id,
    },
  });
  return !!user.defaultScheduleId || !!defaultSchedule;
};
