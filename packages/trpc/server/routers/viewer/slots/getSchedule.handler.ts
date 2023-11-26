import type { IncomingMessage } from "http";

import { getServerSession } from "@calcom/features/auth/lib/getServerSession";

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
  const { req, res } = ctx;
  const session = await getServerSession({ req, res });
  input.bookerUserId = session?.user?.id;
  return await getAvailableSlots({ ctx, input });
};
