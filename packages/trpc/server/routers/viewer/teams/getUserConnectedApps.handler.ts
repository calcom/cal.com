import { Prisma } from "@prisma/client";

import { getAppFromSlug } from "@calcom/app-store/utils";
import type { PrismaClient } from "@calcom/prisma";
import type { AppCategories } from "@calcom/prisma/enums";
import type { TrpcSessionUser } from "@calcom/trpc/server/trpc";

import type { TGetUserConnectedAppsInputSchema } from "./getUserConnectedApps.schema";

type GetUserConnectedAppsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetUserConnectedAppsInputSchema;
};

const credentialSelect = Prisma.validator<Prisma.CredentialSelect>()({
  userId: true,
  app: {
    select: {
      slug: true,
      categories: true,
    },
  },
  destinationCalendars: {
    select: {
      externalId: true,
    },
  },
});

type Credential = Prisma.CredentialGetPayload<{ select: typeof credentialSelect }>;

type Apps = {
  name: string | null;
  logo: string | null;
  externalId: string | null;
  app: { slug: string; categories: AppCategories[] } | null;
};

// This should improve performance saving already app data found.
const appDataMap = new Map();

export const getUserConnectedAppsHandler = async ({ ctx, input }: GetUserConnectedAppsOptions) => {
  const { userIds } = input;

  const credentialsPromises: Promise<Credential[]>[] = [];
  const userConnectedAppsMap: Record<number, Apps[]> = {};

  for (const userId of userIds) {
    const cred = ctx.prisma.credential.findMany({
      where: {
        userId,
      },
      select: credentialSelect,
    });
    credentialsPromises.push(cred);
  }

  const credentialsList = await Promise.all(credentialsPromises);

  for (const credentials of credentialsList) {
    const userId = credentials[0]?.userId;

    if (userId) {
      userConnectedAppsMap[userId] = credentials?.map((cred) => {
        const appSlug = cred.app?.slug;
        let appData = appDataMap.get(appSlug);

        if (!appData) {
          appData = getAppFromSlug(appSlug);
          appDataMap.set(appSlug, appData);
        }

        const isCalendar = cred?.app?.categories?.includes("calendar") ?? false;
        const externalId = isCalendar ? cred.destinationCalendars?.[0]?.externalId : null;
        return {
          name: appData?.name ?? null,
          logo: appData?.logo ?? null,
          app: cred.app,
          externalId: externalId ?? null,
        };
      });
    }
  }

  return userConnectedAppsMap;
};

export default getUserConnectedAppsHandler;
