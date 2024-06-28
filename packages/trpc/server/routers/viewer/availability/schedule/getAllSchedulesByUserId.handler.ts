import { transformAvailabilityForAtom } from "@calcom/lib";
import { hasReadPermissionsForUserId } from "@calcom/lib/hasEditPermissionForUser";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../trpc";
import { getDefaultScheduleId } from "../util";
import type { TGetAllByUserIdInputSchema } from "./getAllSchedulesByUserId.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllByUserIdInputSchema;
};

export const getAllSchedulesByUserIdHandler = async ({ ctx, input }: GetOptions) => {
  const { user } = ctx;

  const schedules = await prisma.schedule.findMany({
    where: {
      userId: input.userId,
    },
    select: {
      id: true,
      userId: true,
      name: true,
      availability: true,
      timeZone: true,
    },
  });

  if (!schedules) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }
  const isCurrentUserPartOfTeam = hasReadPermissionsForUserId({
    ctx,
    input: { memberId: input?.userId },
  });

  const isCurrentUserOwner = input?.userId === user.id;

  if (!isCurrentUserPartOfTeam && !isCurrentUserOwner) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  const defaultScheduleId = await getDefaultScheduleId(input.userId, prisma);

  return {
    schedules: schedules.map((schedule) => {
      return {
        ...schedule,
        availability: transformAvailabilityForAtom(schedule),
        isDefault: schedule.id === defaultScheduleId,
        readOnly: schedule.userId !== user.id,
      };
    }),
  };
};
