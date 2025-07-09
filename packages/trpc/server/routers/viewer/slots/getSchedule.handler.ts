import { mapBusinessErrorToTRPCError } from "@calcom/lib/errorMapping";

import type { GetScheduleOptions } from "./types";
import { getAvailableSlots } from "./util";

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  try {
    return await getAvailableSlots({ ctx, input });
  } catch (error) {
    throw mapBusinessErrorToTRPCError(error);
  }
};
