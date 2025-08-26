import type { LocationObject } from "@calcom/app-store/locations";
import { PrismaAppRepository } from "@calcom/lib/server/repository/app/PrismaAppRepository";
import type { PrismaClient } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

export const bulkUpdateTeamEventsToDefaultLocation = async ({
  eventTypeIds,
  teamId,
  prisma,
}: {
  eventTypeIds: number[];
  teamId: number;
  prisma: PrismaClient;
}) => {
  const team = await prisma.team.findUnique({
    where: { id: teamId },
    select: { metadata: true },
  });
  const defaultApp = teamMetadataSchema.parse(team?.metadata)?.defaultConferencingApp;

  if (!defaultApp?.appSlug) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Default conferencing app not set",
    });
  }
  const appRepository = new PrismaAppRepository();
  const [appDataResult, credentialResult] = await Promise.allSettled([
    appRepository.getAppDataFromSlug(defaultApp.appSlug),
    prisma.credential.findFirst({
      where: {
        teamId,
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
      teamId,
    },
    data: {
      locations: [
        { type: appType, link: defaultApp.appLink, credentialId: credential?.id },
      ] as LocationObject[],
    },
  });
};
