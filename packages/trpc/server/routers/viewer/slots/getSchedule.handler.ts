import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";

import type { GetScheduleOptions } from "./types";

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const availableSlotsService = getAvailableSlotsService();
  // Bypass Redis cache only for verified host reschedule requests.
  if (
    input.rescheduledBy &&
    input.rescheduleUid &&
    ctx?.authenticatedEmail &&
    ctx.authenticatedEmail === input.rescheduledBy
  ) {
    return await availableSlotsService.getAvailableSlotsWithoutCache({ ctx, input });
  }
  // Strip rescheduledBy from the cached path input to prevent cache key pollution.
  // When the request isn't a verified host reschedule, rescheduledBy has no effect
  // on the computation but would create redundant cache entries if left in the key.
  const { rescheduledBy: _rescheduledBy, ...cachedInput } = input;
  return await availableSlotsService.getAvailableSlots({ ctx, input: cachedInput as typeof input });
};
