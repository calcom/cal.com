import { getPublicEvent } from "@calcom/features/eventtypes/lib/getPublicEvent";
import prisma from "@calcom/prisma";
import type { TEventInputSchema } from "@calcom/trpc/server/routers/publicViewer/event.schema";

export class EventRepository {
  static async getPublicEvent(input: TEventInputSchema, userId?: number) {
    const event = await getPublicEvent(
      input.username,
      input.eventSlug,
      input.isTeamEvent,
      input.org,
      prisma,
      input.fromRedirectOfNonOrgLink,
      userId
    );
    return event;
  }
}
