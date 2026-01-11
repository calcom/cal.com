import { EventRepository } from "@calcom/features/eventtypes/repositories/EventRepository";

import type { TEventInputSchema } from "./event.schema";

interface EventHandlerOptions {
  input: TEventInputSchema;
  userId?: number;
}

export const eventHandler = async ({ input, userId }: EventHandlerOptions) => {
  return await EventRepository.getPublicEvent(input, userId);
};

export default eventHandler;
