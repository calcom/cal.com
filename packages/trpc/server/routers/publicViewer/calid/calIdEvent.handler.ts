import { EventRepository } from "@calcom/lib/server/repository/event";

import type { TEventInputSchema } from "./calIdEvent.schema";

interface EventHandlerOptions {
  input: TEventInputSchema;
  userId?: number;
}

export const eventHandler = async ({ input, userId }: EventHandlerOptions) => {
  return await EventRepository.getCalIdPublicEvent(input, userId);
};

export default eventHandler;
