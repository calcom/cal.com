import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { userMetadata as userMetadataSchema, eventTypeMetaDataSchemaWithoutApps } from "@calcom/prisma/zod-utils";

import type { LocationObject } from "../locations";
import { getAppFromSlug } from "../utils";

export const bulkUpdateEventsToDefaultLocation = async ({
  eventTypeIds,
  user,
  prisma,
}: {
  eventTypeIds: number[];
  user: Pick<User, "id" | "metadata">;
  prisma: PrismaClient;
}) => {
  const defaultApp = userMetadataSchema.parse(user.metadata)?.defaultConferencingApp;

  if (!defaultApp) {
    throw new Error("Default conferencing app not set");
  }

  const foundApp = getAppFromSlug(defaultApp.appSlug);
  const appType = foundApp?.appData?.location?.type;
  if (!appType) {
    throw new Error(`Default conferencing app '${defaultApp.appSlug}' doesnt exist.`);
  }

  const credential = await prisma.credential.findFirst({
    where: {
      userId: user.id,
      appId: foundApp.slug,
    },
    select: {
      id: true,
    },
  });

  const eventTypesToUpdate = await prisma.eventType.findMany({
    where: {
      id: {
        in: eventTypeIds,
      },
      userId: user.id,
    },
    select: {
      id: true,
      metadata: true,
      parentId: true,
    },
  });

  const validEventTypeIds = eventTypesToUpdate
    .filter((eventType) => {
      if (!eventType.parentId) {
        return true;
      }

      const metadata = eventTypeMetaDataSchemaWithoutApps.safeParse(eventType.metadata);
      if (!metadata.success || !metadata.data?.managedEventConfig) {
        return true;
      }

      const unlockedFields = metadata.data.managedEventConfig.unlockedFields;
      return unlockedFields?.locations !== undefined;
    })
    .map((eventType) => eventType.id);

  if (validEventTypeIds.length === 0) {
    return { count: 0 };
  }

  return await prisma.eventType.updateMany({
    where: {
      id: {
        in: validEventTypeIds,
      },
      userId: user.id,
    },
    data: {
      locations: [
        { type: appType, link: defaultApp.appLink, credentialId: credential?.id },
      ] as LocationObject[],
    },
  });
};
