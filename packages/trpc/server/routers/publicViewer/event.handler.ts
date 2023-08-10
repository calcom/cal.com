import { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";
import type { PrismaType } from "@calcom/prisma";

import type { TEventInputSchema } from "./event.schema";

interface EventHandlerOptions {
  ctx: { prisma: PrismaType };
  input: TEventInputSchema;
}

export const eventHandler = async ({ ctx, input }: EventHandlerOptions) => {
  const event = await getPublicEvent(
    input.username,
    input.eventSlug,
    input.isTeamEvent,
    input.org,
    ctx.prisma
  );
  return event;
};
