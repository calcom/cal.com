import type { IncomingMessage, ServerResponse } from "http";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

import type { TGetScheduleInputSchema } from "./getSchedule.schema";
import { getAvailableSlots } from "./util";

export type GetScheduleOptions = {
  ctx?: ContextForGetSchedule;
  input: TGetScheduleInputSchema;
};

interface ContextForGetSchedule extends Record<string, unknown> {
  req?: (IncomingMessage & { cookies: Partial<{ [key: string]: string }> }) | undefined;
  res?: ServerResponse | undefined;
}

export const getScheduleHandler = async ({ ctx, input }: GetScheduleOptions) => {
  let session;
  if (ctx?.req && ctx?.res) session = await getServerSession({ req: ctx?.req, res: ctx?.res });
  input.bookerUserId = session?.user?.id;
  return await getAvailableSlots({ ctx, input });
};
