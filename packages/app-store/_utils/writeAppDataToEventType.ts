import { EventTypeRepository } from "@calcom/lib/server/repository/eventType";
import prisma from "@calcom/prisma";
import type { AppCategories } from "@calcom/prisma/enums";
import { EventTypeMetaDataSchema } from "@calcom/prisma/zod-utils";

import type { appDataSchemas } from "../apps.schemas.generated";

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
  const eventTypes = teamId
    ? await EventTypeRepository.findAllByTeamIdIncludeManagedEventTypes({ teamId })
    : userId
    ? await EventTypeRepository.findAllByUserId({ userId })
    : [];

  const newAppMetadata = { [appSlug]: { enabled: false, credentialId, appCategories: appCategories } };

  await Promise.all(
    eventTypes.map((eventType) => {
      let metadata = EventTypeMetaDataSchema.parse(eventType.metadata);
      if (metadata?.apps && metadata.apps[appSlug as keyof typeof appDataSchemas]) {
        return;
      }

      metadata = {
        ...metadata,
        apps: {
          ...metadata?.apps,
          ...newAppMetadata,
        },
      };

      return prisma.eventType.update({
        where: {
          id: eventType.id,
        },
        data: {
          metadata,
        },
      });
    })
  );
};

export default writeAppDataToEventType;
