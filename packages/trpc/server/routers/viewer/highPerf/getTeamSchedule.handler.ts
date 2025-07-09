import type { IncomingMessage } from "http";

import { AvailableSlotsService } from "../slots/util";
import type { TGetTeamScheduleInputSchema } from "./getTeamSchedule.schema";

export type GetTeamScheduleOptions = {
  ctx?: ContextForGetSchedule;
  input: TGetTeamScheduleInputSchema;
};

interface ContextForGetSchedule extends Record<string, unknown> {
  req?: (IncomingMessage & { cookies: Partial<{ [key: string]: string }> }) | undefined;
}

export const getTeamScheduleHandler = async ({ ctx, input }: GetTeamScheduleOptions) => {
  const availableSlotsService = new AvailableSlotsService();
  return await availableSlotsService.getAvailableSlots({ ctx, input });
};
