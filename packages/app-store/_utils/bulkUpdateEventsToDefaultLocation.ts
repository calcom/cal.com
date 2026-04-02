import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";
import type { LocationObject } from "../locations";
import { getAppFromSlug } from "../utils";
import { filterEventTypesWhereLocationUpdateIsAllowed } from "./getBulkEventTypes";

type PrismaLike = Pick<PrismaClient, "credential" | "eventType">;

export const bulkUpdateEventsToDefaultLocation = async ({
  eventTypeIds,
  user,
  prisma,
}: {
  eventTypeIds: number[];
  user: Pick<User, "id" | "metadata">;
  prisma: PrismaLike;
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

  const validEventTypeIds = filterEventTypesWhereLocationUpdateIsAllowed(eventTypesToUpdate).map(
    (eventType) => eventType.id
  );

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
