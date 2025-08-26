import type { LocationObject } from "@calcom/app-store/locations";
import { getBulkUserEventTypes } from "@calcom/lib/event-types/getBulkEventTypes";
import { AppRepository } from "@calcom/lib/server/repository/app/PrismaAppRepository";
import prisma from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";

const setDefaultConferencingApp = async (userId: number, appSlug: string) => {
  const eventTypes = await getBulkUserEventTypes(userId);
  const eventTypeIds = eventTypes.eventTypes.map((item) => item.id);
  const appRepository = new AppRepository();
  const [foundApp, user] = await Promise.all([
    appRepository.getMetadataFromSlug(appSlug),
    prisma.user.findUnique({
      where: {
        id: userId,
      },
      select: {
        metadata: true,
        credentials: true,
      },
    }),
  ]);
  const appType = foundApp?.appData?.location?.type;

  if (!appType) {
    return;
  }

  const currentMetadata = userMetadata.parse(user?.metadata);
  const credentialId = user?.credentials.find((item) => item.appId == appSlug)?.id;

  //Update the default conferencing app for the user.
  await Promise.all([
    prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        metadata: {
          ...currentMetadata,
          defaultConferencingApp: {
            appSlug,
          },
        },
      },
    }),
    prisma.eventType.updateMany({
      where: {
        id: {
          in: eventTypeIds,
        },
        userId,
      },
      data: {
        locations: [{ type: appType, credentialId }] as LocationObject[],
      },
    }),
  ]);
};
export default setDefaultConferencingApp;
