import type { ScheduleWithAvailabilitiesForWeb } from "@calcom/lib";
import {
  transformAvailabilityForClient,
  transformDateOverridesForClient,
  transformWorkingHoursForClient,
} from "@calcom/lib";
import { hasReadPermissionsForUserId } from "@calcom/lib/hasEditPermissionForUser";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import { getDefaultScheduleId } from "../util";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions): Promise<ScheduleWithAvailabilitiesForWeb> => {
  const { user } = ctx;

  const schedule = await prisma.schedule.findUnique({
    where: {
      id: input.scheduleId || (await getDefaultScheduleId(user.id, prisma)),
    },
    select: {
      id: true,
      userId: true,
      name: true,
      availability: true,
      timeZone: true,
    },
  });

  if (!schedule) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }
  const isCurrentUserPartOfTeam = hasReadPermissionsForUserId({
    ctx,
    input: { memberId: schedule?.userId },
  });

  const isCurrentUserOwner = schedule?.userId === user.id;

  if (!isCurrentUserPartOfTeam && !isCurrentUserOwner) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  const timeZone = schedule.timeZone || user.timeZone;

  const schedulesCount = await prisma.schedule.count({
    where: {
      userId: user.id,
    },
  });
  // disabling utc casting while fetching WorkingHours
  return {
    id: schedule.id,
    name: schedule.name,
    isManaged: schedule.userId !== user.id,
    workingHours: transformWorkingHoursForClient(schedule),
    schedule: schedule.availability,
    availability: transformAvailabilityForClient(schedule),
    timeZone,
    dateOverrides: transformDateOverridesForClient(schedule, timeZone),
    isDefault: !input.scheduleId || user.defaultScheduleId === schedule.id,
    isLastSchedule: schedulesCount <= 1,
    readOnly: schedule.userId !== user.id && !input.isManagedEventType,
  };
};
