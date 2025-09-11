import type { Prisma } from "@prisma/client";
import { z } from "zod";

import { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import { prisma } from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

const EventTypeAppMetadataSchema = z.object(appDataSchemas).partial();

export class EventTypeService {
  static async getEventTypeAppDataFromId(eventTypeId: number, appSlug: string) {
    const eventType = await prisma.eventType.findUnique({
      where: {
        id: eventTypeId,
      },
      select: {
        metadata: true,
      },
    });

    if (!eventType) return null;

    return this.getEventTypeAppDataFromMetadata(eventType.metadata, appSlug);
  }

  static getEventTypeAppDataFromMetadata(metadata: Prisma.JsonValue, appSlug: string) {
    const parseEventTypeAppMetadata = EventTypeMetaDataSchema.safeParse(metadata);

    if (!parseEventTypeAppMetadata.success || !parseEventTypeAppMetadata.data?.apps) return null;

    const eventTypeAppMetadata = parseEventTypeAppMetadata.data.apps;
    const apps = EventTypeAppMetadataSchema.parse(eventTypeAppMetadata);
    const appMetadata = apps?.[appSlug as keyof typeof apps];

    return appMetadata;
  }
}
