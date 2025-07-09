import type { GetScheduleOptions } from "./types";
import { AvailableSlotsService } from "./util";

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  const availableSlotsService = new AvailableSlotsService();
  return await availableSlotsService.getAvailableSlots({ ctx, input });
};
