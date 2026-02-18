import { getAvailableSlotsService, handleReschedulingContext } from "@calcom/features/di/containers/AvailableSlots";
import { SOME_CONSTANT } from "@calcom/core/constants";

import type { GetScheduleOptions } from "./types";

import { fetchUserAvailability } from "@calcom/features/di/containers/UserAvailability";

export const getAvailabilityHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const userAvailabilityService = fetchUserAvailability(ctx);
  return await userAvailabilityService.getAvailability({ ctx, input });
};

export const getAvailability = async ({ ctx, input }: GetScheduleOptions) => {
  const userAvailabilityService = fetchUserAvailability();
  return await userAvailabilityService.getAvailableSlots({ ctx, input });
};