import { EventRepository } from "@calcom/lib/server/repository/event";

import type { TEventInputSchema } from "./event.schema";

interface EventHandlerOptions {
  input: TEventInputSchema;
}

export const eventHandler = async ({ input }: EventHandlerOptions) => {
  return await EventRepository.getPublicEvent(input);
};

export default eventHandler;
