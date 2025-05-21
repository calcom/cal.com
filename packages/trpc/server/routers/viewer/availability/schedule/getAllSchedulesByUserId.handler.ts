import { hasReadPermissionsForUserId } from "@calcom/lib/hasEditPermissionForUser";
import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../types";
import { getDefaultScheduleId } from "../util";
import type { TGetAllByUserIdInputSchema } from "./getAllSchedulesByUserId.schema";

const log = logger.getSubLogger({ prefix: ["getAllSchedulesByUserIdHandler"] });

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetAllByUserIdInputSchema;
};

export const getAllSchedulesByUserIdHandler = async ({ ctx, input }: GetOptions) => {
  const { user } = ctx;

  const isCurrentUserPartOfTeam = hasReadPermissionsForUserId({ memberId: input?.userId, userId: user.id });

  const isCurrentUserOwner = input?.userId === user.id;

  if (!isCurrentUserPartOfTeam && !isCurrentUserOwner) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
    });
  }

  const schedules = await prisma.schedule.findMany({
    where: {
      userId: input.userId,
    },
    select: {
      id: true,
      userId: true,
      name: true,
    },
  });

  if (!schedules) {
    log.error(`No Schedules found for userId:${input.userId}`);
    throw new TRPCError({
      code: "NOT_FOUND",
    });
  }

  const defaultScheduleId = await getDefaultScheduleId(input.userId, prisma);

  return {
    schedules: schedules.map((schedule) => {
      return {
        ...schedule,
        isDefault: schedule.id === defaultScheduleId,
        readOnly: schedule.userId !== user.id,
      };
    }),
  };
};
