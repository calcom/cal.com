import type { Prisma } from "@prisma/client";

import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TScheduleDuplicateSchema } from "./duplicate.schema";

type DuplicateScheduleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TScheduleDuplicateSchema;
};

export const duplicateHandler = async ({ ctx, input }: DuplicateScheduleOptions) => {
  try {
    const { scheduleId } = input;
    const { user } = ctx;
    const schedule = await prisma.schedule.findUnique({
      where: {
        id: scheduleId,
      },
      select: {
        id: true,
        userId: true,
        name: true,
        availability: true,
        timeZone: true,
      },
    });

    if (!schedule || schedule.userId !== user.id) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }

    const { availability } = schedule;

    const data: Prisma.ScheduleCreateInput = {
      name: `${schedule.name} (Copy)`,
      user: {
        connect: {
          id: user.id,
        },
      },
      timeZone: schedule.timeZone ?? user.timeZone,
      availability: {
        createMany: {
          data: availability.map((schedule) => ({
            days: schedule.days,
            startTime: schedule.startTime,
            endTime: schedule.endTime,
            date: schedule.date,
          })),
        },
      },
    };

    const newSchedule = await prisma.schedule.create({
      data,
    });

    return { schedule: newSchedule };
  } catch (error) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  }
};
