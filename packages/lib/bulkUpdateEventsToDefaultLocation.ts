import type { LocationObject } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import { userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

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
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Default conferencing app not set",
    });
  }

  const foundApp = getAppFromSlug(defaultApp.appSlug);
  const appType = foundApp?.appData?.location?.type;
  if (!appType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Default conferencing app '${defaultApp.appSlug}' doesnt exist.`,
    });
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

  return await prisma.eventType.updateMany({
    where: {
      id: {
        in: eventTypeIds,
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
