import type { TGetScheduleInputSchema } from "./getSchedule.schema";
import { getAvailableSlots } from "./util";

type GetScheduleOptions = {
  ctx: Record<string, unknown>;
  input: TGetScheduleInputSchema;
};

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  return await getAvailableSlots(ctx, input);
};
