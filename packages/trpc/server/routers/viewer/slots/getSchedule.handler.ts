import type { TGetScheduleInputSchema } from "./getSchedule.schema";
import { getSchedule } from "./util";

type GetScheduleOptions = {
  ctx: Record<string, unknown>;
  input: TGetScheduleInputSchema;
};

export const getScheduleHandler = async ({ input }: GetScheduleOptions) => {
  return await getSchedule(input);
};
