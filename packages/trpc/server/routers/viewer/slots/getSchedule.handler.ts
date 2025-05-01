import type { GetScheduleOptions } from "./types";
import { getAvailableSlots } from "./util";

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  return await getAvailableSlots({ ctx, input });
};
