import type { LocationObject } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
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
      teamId,
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
      teamId,
    },
    data: {
      locations: [
        { type: appType, link: defaultApp.appLink, credentialId: credential?.id },
      ] as LocationObject[],
    },
  });
};
