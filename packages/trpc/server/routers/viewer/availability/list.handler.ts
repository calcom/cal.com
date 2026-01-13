import { ScheduleRepository } from "@calcom/features/schedules/repositories/ScheduleRepository";
import { prisma } from "@calcom/prisma";

import type { TrpcSessionUser } from "../../../types";

type ListOptions = {
  ctx: {
    user: Pick<NonNullable<TrpcSessionUser>, "id" | "defaultScheduleId">;
  };
};

export type GetAvailabilityListHandlerReturn = Awaited<ReturnType<typeof listHandler>>;

export const listHandler = async ({ ctx }: ListOptions) => {
  const { user } = ctx;

  const scheduleRepository = new ScheduleRepository(prisma);
  const result = await scheduleRepository.getScheduleListWithDefault(user.id);

  if (result.schedules.length > 0 && !user.defaultScheduleId) {
    const defaultSchedule = result.schedules.find((s) => s.isDefault);
    if (defaultSchedule) {
      await scheduleRepository.setupDefaultSchedule(user.id, defaultSchedule.id);
    }
  }

  return result;
};
