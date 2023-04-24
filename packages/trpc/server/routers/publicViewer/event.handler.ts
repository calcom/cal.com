import type { PrismaClient } from "@prisma/client";

import { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";

import type { TEventInputSchema } from "./event.schema";

interface EventHandlerOptions {
  ctx: { prisma: PrismaClient };
  input: TEventInputSchema;
}

export const eventHandler = async ({ ctx, input }: EventHandlerOptions) => {
  const event = await getPublicEvent(input.username, input.eventSlug, ctx.prisma);
  return event;
};
