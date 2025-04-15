import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";

import type { TEventInputSchema } from "./event.schema";

interface EventHandlerOptions {
  input: TEventInputSchema;
  userId?: number;
}

export const eventHandler = async ({ input, userId }: EventHandlerOptions) => {
  return await EventTypeRepository.getPublicEvent({ ...input, currentUserId: userId });
};

export default eventHandler;
