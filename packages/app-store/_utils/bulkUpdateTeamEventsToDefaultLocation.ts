import type { PrismaClient } from "@calcom/prisma";
import { teamMetadataSchema } from "@calcom/prisma/zod-utils";
import type { LocationObject } from "../locations";
import { getAppFromSlug } from "../utils";

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
  const metadataResult = teamMetadataSchema.safeParse(team?.metadata);
  const defaultApp = metadataResult.success ? metadataResult.data?.defaultConferencingApp : null;

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
