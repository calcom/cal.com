import { transformScheduleToAvailabilityForClient } from "@calcom/lib";
import { getAvailabilityFromSchedule } from "@calcom/lib/availability";
import { hasEditPermissionForUserID } from "@calcom/lib/hasEditPermissionForUser";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import { setupDefaultSchedule } from "../util";
import type { TUpdateInputSchema } from "./update.schema";

type User = NonNullable<TrpcSessionUser>;
type UpdateOptions = {
  ctx: {
    user: { id: User["id"]; defaultScheduleId: User["defaultScheduleId"]; timeZone: User["timeZone"] };
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

  if (!userSchedule) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  if (userSchedule?.userId !== user.id) {
    const hasEditPermission = await hasEditPermissionForUserID({
      ctx,
      input: { memberId: userSchedule.userId },
    });
    if (!hasEditPermission) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
      });
    }
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
          id: true,
          eventName: true,
        },
      },
    },
  });

  const userAvailability = transformScheduleToAvailabilityForClient(schedule);

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
