import type { Prisma } from "@calcom/prisma/client";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import { enabledAppSlugs } from "./enabledApps";

const getEventTypeAppMetadata = (metadata: Prisma.JsonValue) => {
  const eventTypeMetadataParse = EventTypeMetaDataSchema.safeParse(metadata);

  if (!eventTypeMetadataParse.success || !eventTypeMetadataParse.data) return;

  const appMetadata = eventTypeMetadataParse.data.apps;

  const eventTypeAppMetadata: Record<string, any> = {};

  if (appMetadata) {
    for (const appSlug of Object.keys(appMetadata)) {
      if (enabledAppSlugs.includes(appSlug)) {
        eventTypeAppMetadata[appSlug] = appMetadata[appSlug as keyof typeof appMetadata];
      }
    }
  }

  return eventTypeAppMetadata;
};

export default getEventTypeAppMetadata;
