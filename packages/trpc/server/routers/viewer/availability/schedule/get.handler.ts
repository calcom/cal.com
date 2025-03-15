import { ScheduleRepository } from "@calcom/lib/server/repository/schedule";
import {
  transformAvailabilityForAtom,
  transformDateOverridesForAtom,
  transformWorkingHoursForAtom,
} from "@calcom/platform-utils/transformers/schedules";

import type { TrpcSessionUser } from "../../../../trpc";
import type { TGetInputSchema } from "./get.schema";

type GetOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
  };
  input: TGetInputSchema;
};

export const getHandler = async ({ ctx, input }: GetOptions) => {
  const detailedSchedule = await ScheduleRepository.findDetailedScheduleById({
    scheduleId: input.scheduleId,
    isManagedEventType: input.isManagedEventType,
    userId: ctx.user.id,
    timeZone: ctx.user.timeZone,
    defaultScheduleId: ctx.user.defaultScheduleId,
  });

  const scheduleToTransform = {
    timeZone: detailedSchedule.timeZone,
    availability: detailedSchedule.schedule,
  };

  return {
    ...detailedSchedule,
    // TODO: Ideally this tRPC router doesn't know about @calcom/platform
    // since tRPC routers aren't used by Platform
    // but choosing to not do larger refactor - KAW 2025-03-14
    workingHours: transformWorkingHoursForAtom(scheduleToTransform),
    availability: transformAvailabilityForAtom(scheduleToTransform),
    dateOverrides: transformDateOverridesForAtom(scheduleToTransform, detailedSchedule.timeZone),
  };
};
