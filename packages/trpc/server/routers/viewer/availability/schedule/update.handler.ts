import { getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import { convertScheduleToAvailability, setupDefaultSchedule } from "../util";
import type { TUpdateInputSchema } from "./update.schema";

type UpdateOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TUpdateInputSchema;
};

export const updateHandler = async ({ input, ctx }: UpdateOptions) => {
  const { user } = ctx;
  const availability = input.schedule
    ? getAvailabilityFromSchedule(input.schedule)
    : (input.dateOverrides || []).map((dateOverride) => ({
        startTime: dateOverride.start,
        endTime: dateOverride.end,
        date: dateOverride.start,
        days: [],
      }));

  // Not able to update the schedule with userId where clause, so fetch schedule separately and then validate
  // Bug: https://github.com/prisma/prisma/issues/7290
  const userSchedule = await prisma.schedule.findUnique({
    where: {
      id: input.scheduleId,
    },
    select: {
      userId: true,
      name: true,
      id: true,
    },
  });

  if (userSchedule?.userId !== user.id) throw new TRPCError({ code: "UNAUTHORIZED" });

  if (!userSchedule || userSchedule.userId !== user.id) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  let updatedUser;
  if (input.isDefault) {
    const setupDefault = await setupDefaultSchedule(user.id, input.scheduleId, prisma);
    updatedUser = setupDefault;
  }

  if (!input.name) {
    // TODO: Improve
    // We don't want to pass the full schedule for just a set as default update
    // but in the current logic, this wipes the existing availability.
    // Return early to prevent this from happening.
    return {
      schedule: userSchedule,
      isDefault: updatedUser
        ? updatedUser.defaultScheduleId === input.scheduleId
        : user.defaultScheduleId === input.scheduleId,
    };
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
          data: [
            ...availability,
            ...(input.dateOverrides || []).map((override) => ({
              date: override.start,
              startTime: override.start,
              endTime: override.end,
            })),
          ],
        },
      },
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

  const userAvailability = convertScheduleToAvailability(schedule);

  return {
    schedule,
    availability: userAvailability,
    timeZone: schedule.timeZone || user.timeZone,
    isDefault: updatedUser
      ? updatedUser.defaultScheduleId === schedule.id
      : user.defaultScheduleId === schedule.id,
    prevDefaultId: user.defaultScheduleId,
    currentDefaultId: updatedUser ? updatedUser.defaultScheduleId : user.defaultScheduleId,
  };
};
