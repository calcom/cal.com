import { EventService } from "@calcom/features/eventtypes/lib/event-service";
import { prisma } from "@calcom/prisma";

import type { TEventInputSchema } from "./event.schema";

interface EventHandlerOptions {
  input: TEventInputSchema;
}

const eventService = new EventService(prisma);

export const eventHandler = async ({ input }: EventHandlerOptions) => {
  const event = await eventService.getPublicEvent(
    input.username,
    input.eventSlug,
    input.isTeamEvent,
    input.org
  );
  return event;
};

export default eventHandler;
