import prisma from "@calcom/prisma";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

const writeAppDataToEventType = async ({
  userId,
  teamId,
  appSlug,
  appCategories,
  credentialId,
}: {
  userId?: number;
  teamId?: number;
  appSlug: string;
  appCategories: AppCategories[];
  credentialId: number;
}) => {
  //   Search for event types belonging to the user / team
  const eventTypes = await prisma.eventType.findMany({
    where: {
      OR: [
        {
          ...(teamId ? { teamId } : { userId: userId }),
        },
        // for managed events
        {
          parent: {
            teamId,
          },
        },
      ],
    },
    select: {
      id: true,
      metadata: true,
    },
  });

  const newAppMetadata = { [appSlug]: { enabled: false, credentialId, appCategories: appCategories } };

  const updateEventTypeMetadataPromises = [];

  for (const eventType of eventTypes) {
    let metadata = EventTypeMetaDataSchema.parse(eventType.metadata);

    if (metadata?.apps[appSlug]) {
      continue;
    }

    metadata = {
      ...metadata,
      apps: {
        ...metadata?.apps,
        ...newAppMetadata,
      },
    };

    updateEventTypeMetadataPromises.push(
      prisma.eventType.update({
        where: {
          id: eventType.id,
        },
        data: {
          metadata,
        },
      })
    );
  }

  await Promise.all(updateEventTypeMetadataPromises);
};

export default writeAppDataToEventType;
