import type { LocationObject } from "@calcom/app-store/locations";
import { getAppFromSlug } from "@calcom/app-store/utils";
import type { PrismaClient } from "@calcom/prisma";
import type { User } from "@calcom/prisma/client";
import type { DefaultConferencingApp } from "@calcom/prisma/zod-utils";
import { teamMetadataSchema, userMetadata as userMetadataSchema } from "@calcom/prisma/zod-utils";

import { TRPCError } from "@trpc/server";

type OwnerContext = {
  user: Pick<User, "id" | "metadata">;
  teamId?: number;
};

/**
 * Retrieves the default conferencing app configuration for a user or team
 */
async function getDefaultConferencingApp(
  prisma: PrismaClient,
  { user, teamId }: OwnerContext
): Promise<DefaultConferencingApp> {
  let defaultApp;
  if (teamId) {
    const team = await prisma.team.findFirst({
      where: { id: teamId },
      select: { metadata: true },
    });
    defaultApp = teamMetadataSchema.parse(team?.metadata)?.defaultConferencingApp;
  } else {
    defaultApp = userMetadataSchema.parse(user.metadata)?.defaultConferencingApp;
  }

  if (!defaultApp) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Default conferencing app not set",
    });
  }

  return defaultApp;
}

/**
 * Validates the conferencing app and returns its location type
 */
function validateConferencingApp(defaultApp: DefaultConferencingApp): string {
  const foundApp = getAppFromSlug(defaultApp.appSlug);
  const appType = foundApp?.appData?.location?.type;

  if (!appType) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Default conferencing app '${defaultApp.appSlug}' doesn't exist.`,
    });
  }

  return appType;
}

/**
 * Retrieves the credential for the specified conferencing app
 */
async function getAppCredential(
  prisma: PrismaClient,
  { user, teamId }: OwnerContext,
  appSlug?: string
): Promise<{ id: number } | null> {
  return await prisma.credential.findFirst({
    where: {
      ...(teamId ? { teamId } : { userId: user.id }),
      appId: appSlug,
    },
    select: { id: true },
  });
}

/**
 * Updates multiple event types to use the default conferencing location
 */
export const bulkUpdateEventsToDefaultLocation = async ({
  eventTypeIds,
  user,
  prisma,
  teamId,
}: {
  eventTypeIds: number[];
  user: Pick<User, "id" | "metadata">;
  prisma: PrismaClient;
  teamId?: number;
}) => {
  const ownerContext = { user, teamId };

  const defaultApp = await getDefaultConferencingApp(prisma, ownerContext);

  const appType = validateConferencingApp(defaultApp);

  const credential = await getAppCredential(prisma, ownerContext, defaultApp.appSlug);

  return await prisma.eventType.updateMany({
    where: {
      id: { in: eventTypeIds },
      ...(teamId ? { teamId } : { userId: user.id }),
    },
    data: {
      locations: [
        {
          type: appType,
          link: defaultApp.appLink,
          credentialId: credential?.id,
        },
      ] as LocationObject[],
    },
  });
};
