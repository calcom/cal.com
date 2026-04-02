import { getAvailableSlotsService } from "@calcom/features/di/containers/AvailableSlots";
import type { GetScheduleOptions } from "./types";

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const availableSlotsService = getAvailableSlotsService();
  return await availableSlotsService.getAvailableSlots({ ctx, input });
};
