import { getShouldServeCache } from "@calcom/features/calendar-cache/lib/getShouldServeCache";
import { createScheduleCacheKey, getCachedSchedule, setCachedScheduleWithTracking } from "@calcom/lib/cache";
import { getAvailableSlotsService } from "@calcom/lib/di/containers/available-slots";

import type { GetScheduleOptions } from "./types";

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const availableSlotsService = getAvailableSlotsService();

  const shouldServeCache = await getShouldServeCache(input._shouldServeCache);

  if (shouldServeCache) {
    const cacheKey = createScheduleCacheKey(input);

    const cachedResult = await getCachedSchedule(cacheKey);
    if (cachedResult) {
      return cachedResult;
    }

    const result = await availableSlotsService.getAvailableSlots({ ctx, input });

    await setCachedScheduleWithTracking(cacheKey, result, input);

    return result;
  }

  return await availableSlotsService.getAvailableSlots({ ctx, input });
};
