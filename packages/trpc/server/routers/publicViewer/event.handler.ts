import { PrismaEventRepository } from "@calcom/lib/server/repository/prismaEvent";

import type { TEventInputSchema } from "./event.schema";

interface EventHandlerOptions {
  input: TEventInputSchema;
  userId?: number;
}

export const eventHandler = async ({ input, userId }: EventHandlerOptions) => {
  return await PrismaEventRepository.getPublicEvent(input, userId);
};

export default eventHandler;
