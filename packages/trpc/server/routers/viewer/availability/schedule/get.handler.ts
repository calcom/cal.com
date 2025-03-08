import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TGetInputSchema } from "./get.schema";

// import {
//   transformAvailabilityForAtom,
//   transformDateOverridesForAtom,
//   transformWorkingHoursForAtom,
// } from "@calcom/platform-utils";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  const schedule = await ScheduleRepository.findDetailedScheduleById({
    scheduleId: input.scheduleId,
    isManagedEventType: input.isManagedEventType,
    userId: ctx.user.id,
    timeZone: ctx.user.timeZone,
    defaultScheduleId: ctx.user.defaultScheduleId,
  });

  return {
    ...schedule,
    // workingHours: transformWorkingHoursForAtom(schedule),
    // availability: transformAvailabilityForAtom(schedule),
    // dateOverrides: transformDateOverridesForAtom(schedule, schedule.timeZone),
  };
};
