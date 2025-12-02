import { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../../types";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  const scheduleRepo = new ScheduleRepository(prisma);
  return await scheduleRepo.findDetailedScheduleById({
    scheduleId: input.scheduleId,
    isManagedEventType: input.isManagedEventType,
    userId: ctx.user.id,
    timeZone: ctx.user.timeZone,
    defaultScheduleId: ctx.user.defaultScheduleId,
  });
};
