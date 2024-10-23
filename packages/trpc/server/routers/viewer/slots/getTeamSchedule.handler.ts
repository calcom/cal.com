import type { IncomingMessage } from "http";

import type { TGetTeamScheduleInputSchema } from "./getTeamSchedule.schema";
import { getAvailableSlots } from "./util";

export type GetTeamScheduleOptions = {
  ctx?: ContextForGetSchedule;
  input: TGetTeamScheduleInputSchema;
};

interface ContextForGetSchedule extends Record<string, unknown> {
  req?: (IncomingMessage & { cookies: Partial<{ [key: string]: string }> }) | undefined;
}

export const getTeamScheduleHandler = async ({ ctx, input }: GetTeamScheduleOptions) => {
  return await getAvailableSlots({ ctx, input });
};
