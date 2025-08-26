import type { LocationObject } from "@calcom/app-store/locations";
import { PrismaAppRepository } from "@calcom/lib/server/repository/app/PrismaAppRepository";
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

  if (!defaultApp.appSlug) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Default conferencing app slug not set",
    });
  }

  const appRepository = new PrismaAppRepository();
  const [appDataResult, credentialResult] = await Promise.allSettled([
    appRepository.getAppDataFromSlug(defaultApp.appSlug),
    prisma.credential.findFirst({
      where: {
        userId: user.id,
        appId: defaultApp.appSlug,
      },
      select: {
        id: true,
      },
    }),
  ]);

  if (appDataResult.status === "rejected") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Failed to fetch default conferencing app data: ${appDataResult.reason}`,
    });
  }

  if (credentialResult.status === "rejected") {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Failed to fetch default conferencing app credential: ${credentialResult.reason}`,
    });
  }

  const appData = appDataResult.value;
  const credential = credentialResult.value;

  const appType = appData?.location?.type;
  if (!appType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Default conferencing app '${defaultApp.appSlug}' doesnt exist.`,
    });
  }

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
