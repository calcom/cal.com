import type { IncomingMessage } from "http";

import type { TGetScheduleInputSchema } from "./getSchedule.schema";
import { getAvailableSlots } from "./util";

export type GetScheduleOptions = {
  ctx?: ContextForGetSchedule;
  input: TGetScheduleInputSchema;
};

interface ContextForGetSchedule extends Record<string, unknown> {
  req?: (IncomingMessage & { cookies: Partial<{ [key: string]: string }> }) | undefined;
}

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  //try {
  throw new Error("Let's send this to sentry");
  return await getAvailableSlots({ ctx, input });
  //} catch (error) {
  //Sentry.captureException(error);
  //}
};
