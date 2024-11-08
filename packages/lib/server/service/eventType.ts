import type { appDataSchemas } from "@calcom/app-store/apps.schemas.generated";
import { prisma } from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

export class EventTypeService {
  static async getEventTypeAppData(eventTypeId: number, appSlug: keyof typeof appDataSchemas) {
    const eventType = await prisma.eventType.findFirst({
      where: {
        id: eventTypeId,
      },
      select: {
        metadata: true,
      },
    });

    if (!eventType) return null;

    const parseEventTypeAppMetadata = EventTypeMetaDataSchema.safeParse(eventType.metadata);

    if (!parseEventTypeAppMetadata.success || !parseEventTypeAppMetadata.data?.apps) return null;

    const eventTypeAppMetadata = parseEventTypeAppMetadata.data.apps;

    const appMetadata = eventTypeAppMetadata[appSlug];

    return appMetadata;
  }
}
