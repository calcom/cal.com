import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
import type { EventType } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { markdownToSafeHTML } from "../markdownToSafeHTML";

const log = logger.getSubLogger({ prefix: ["getEventTypesPublic"] });

export type EventTypesPublic = Awaited<ReturnType<typeof getEventTypesPublic>>;

export async function getEventTypesPublic(userId: number) {
  const eventTypesWithHidden = await getEventTypesWithHiddenFromDB(userId);

  const eventTypesRaw = eventTypesWithHidden.filter((evt) => !evt.hidden);

  return eventTypesRaw.map((eventType) => ({
    ...eventType,
    metadata: EventTypeMetaDataSchema.parse(eventType.metadata || {}),
    descriptionAsSafeHTML: markdownToSafeHTML(eventType.description),
  }));
}

const getEventTypesWithHiddenFromDB = async (userId: number) => {
  const eventTypes = await prisma.$queryRaw<EventType[]>`
    SELECT "t"."id", "t"."title", "t"."description", "t"."length", "t"."schedulingType"::text, "t"."recurringEvent", "t"."slug", "t"."hidden", "t"."price", "t"."currency", "t"."lockTimeZoneToggleOnBookingPage", "t"."requiresConfirmation", "t"."requiresBookerEmailVerification", "t"."metadata", "t"."position"
    FROM (
      SELECT "et1"."id", "et1"."title", "et1"."description", "et1"."length", "et1"."schedulingType"::text, "et1"."recurringEvent", "et1"."slug", "et1"."hidden", "et1"."price", "et1"."currency", "et1"."lockTimeZoneToggleOnBookingPage", "et1"."requiresConfirmation", "et1"."requiresBookerEmailVerification", "et1"."metadata", "et1"."position"
      FROM "public"."EventType" "et1"
      WHERE "et1"."teamId" IS NULL AND "et1"."userId" = ${userId}
      UNION
      SELECT "et2"."id", "et2"."title", "et2"."description", "et2"."length", "et2"."schedulingType"::text, "et2"."recurringEvent", "et2"."slug", "et2"."hidden", "et2"."price", "et2"."currency", "et2"."lockTimeZoneToggleOnBookingPage", "et2"."requiresConfirmation", "et2"."requiresBookerEmailVerification", "et2"."metadata", "et2"."position"
      FROM "public"."EventType" "et2"
      INNER JOIN "public"."_user_eventtype" "uet" on "uet"."A" = "et2"."id"
      WHERE "uet"."B" = ${userId} AND "et2"."teamId" IS NULL
    ) t
    ORDER BY "t"."position" DESC, "t"."id" ASC
  `;

  // map and filter metadata, exclude eventType entirely when faulty metadata is found.
  // report error to exception so we don't lose the error.
  return eventTypes.reduce<typeof eventTypes>((eventTypes, eventType) => {
    const parsedMetadata = EventTypeMetaDataSchema.safeParse(eventType.metadata);
    if (!parsedMetadata.success) {
      log.error(parsedMetadata.error);
      return eventTypes;
    }
    eventTypes.push({
      ...eventType,
      metadata: parsedMetadata.data,
    });
    return eventTypes;
  }, []);
};
