import type { IncomingMessage } from "http";

import type { TGetScheduleInputSchema } from "./getTeamSchedule.schema";
import { getAvailableSlots } from "./util";

export type GetScheduleOptions = {
  ctx?: ContextForGetSchedule;
  input: TGetScheduleInputSchema;
};

interface ContextForGetSchedule extends Record<string, unknown> {
  req?: (IncomingMessage & { cookies: Partial<{ [key: string]: string }> }) | undefined;
}

export const getTeamScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  return await getAvailableSlots({ ctx, input });
};
