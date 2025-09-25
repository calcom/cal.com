import logger from "@calcom/lib/logger";
import { prisma } from "@calcom/prisma";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../../../types";
import { getDefaultScheduleId } from "../../util";
import type { TCalIdGetAllByUserIdInputSchema } from "./getAllSchedulesByUserId.schema";

const log = logger.getSubLogger({ prefix: ["calid_getAllSchedulesByUserIdHandler"] });

type CalIdGetAllSchedulesByUserIdOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TCalIdGetAllByUserIdInputSchema;
};

export const calid_getAllSchedulesByUserIdHandler = async ({
  ctx,
  input,
}: CalIdGetAllSchedulesByUserIdOptions) => {
  const { user } = ctx;

  const isCurrentUserPartOfTeam = await prisma.calIdMembership.findFirst({
    where: {
      userId: user.id,
      acceptedInvitation: true,
    },
  });

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
