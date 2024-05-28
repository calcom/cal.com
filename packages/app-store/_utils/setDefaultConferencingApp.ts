import type { LocationObject } from "@calcom/app-store/locations";
import getBulkEventTypes from "@calcom/lib/event-types/getBulkEventTypes";
import prisma from "@calcom/prisma";
import { userMetadata } from "@calcom/prisma/zod-utils";

const setDefaultConferencingApp = async (userId: number, appSlug: string, appType: string) => {
  const eventTypes = await getBulkEventTypes(userId);
  const eventTypeIds = eventTypes.eventTypes.map((item) => item.id);
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      metadata: true,
    },
  });

  const currentMetadata = userMetadata.parse(user?.metadata);

  //Update the default conferencing app for the user.
  await prisma.user.update({
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
  });

  await prisma.eventType.updateMany({
    where: {
      id: {
        in: eventTypeIds,
      },
      userId,
    },
    data: {
      locations: [{ type: appType }] as LocationObject[],
    },
  });
};
export default setDefaultConferencingApp;
