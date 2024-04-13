import logger from "@calcom/lib/logger";
import prisma from "@calcom/prisma";
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
  const eventTypes = await prisma.$queryRaw`
    SELECT "t"."id", "t"."title", "t"."description", "t"."length", "t"."schedulingType"::text, "t"."recurringEvent", "t"."slug", "t"."hidden", "t"."price", "t"."currency", "t"."lockTimeZoneToggleOnBookingPage", "t"."requiresConfirmation", "t"."requiresBookerEmailVerification", "t"."metadata", "t"."position"
    FROM (
      SELECT "public"."EventType"."id", "public"."EventType"."title", "public"."EventType"."description", "public"."EventType"."length", "public"."EventType"."schedulingType"::text, "public"."EventType"."recurringEvent", "public"."EventType"."slug", "public"."EventType"."hidden", "public"."EventType"."price", "public"."EventType"."currency", "public"."EventType"."lockTimeZoneToggleOnBookingPage", "public"."EventType"."requiresConfirmation", "public"."EventType"."requiresBookerEmailVerification", "public"."EventType"."metadata", "public"."EventType"."position"
      FROM "public"."EventType"
      WHERE "public"."EventType"."teamId" IS NULL AND "public"."EventType"."userId" = ${userId}
      UNION
      SELECT "public"."EventType"."id", "public"."EventType"."title", "public"."EventType"."description", "public"."EventType"."length", "public"."EventType"."schedulingType"::text, "public"."EventType"."recurringEvent", "public"."EventType"."slug", "public"."EventType"."hidden", "public"."EventType"."price", "public"."EventType"."currency", "public"."EventType"."lockTimeZoneToggleOnBookingPage", "public"."EventType"."requiresConfirmation", "public"."EventType"."requiresBookerEmailVerification", "public"."EventType"."metadata", "public"."EventType"."position"
      FROM "public"."EventType"
      INNER JOIN "public"."_user_eventtype" "uet" on "uet"."A" = "public"."EventType"."id"
      WHERE "uet"."B" = ${userId} AND "public"."EventType"."teamId" IS NULL
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
