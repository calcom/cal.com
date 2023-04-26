import type { PrismaClient } from "@prisma/client";

import getEnabledApps from "@calcom/lib/apps/getEnabledApps";
import { TRPCError } from "@calcom/trpc/server";

import type { TrpcSessionUser } from "../../../trpc";
import type { TGetEventTypeAppsInputSchema } from "./getEventTypeApps.schema";

type GetEventTypeAppsOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TGetEventTypeAppsInputSchema;
};

export const getEventTypeAppsHandler = async ({ ctx, input }: GetEventTypeAppsOptions) => {
  const { user, prisma } = ctx;
  const apps = await getEnabledApps(user.credentials);
  const eventTypeApps = apps.filter((app) => app.extendsFeature?.includes("EventType"));

  const eventTypeMetadataQuery = await prisma.eventType.findFirst({
    where: {
      id: input.eventTypeId,
    },
    select: {
      metadata: true,
    },
  });

  if (!eventTypeMetadataQuery) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: `Could not find event type ${input.eventTypeId}`,
    });
  }

  const eventTypeAppsMetadataObject = eventTypeMetadataQuery as { metadata: any };

  let eventTypeAppsMetadata: any = {};
  if (eventTypeAppsMetadataObject.metadata && "apps" in eventTypeAppsMetadataObject.metadata) {
    eventTypeAppsMetadata = eventTypeAppsMetadataObject.metadata.apps as object;
  }

  const currentEventTypeSlugs = Object.keys(eventTypeAppsMetadata);

  const installedApps = [],
    notInstalledApps = [];

  for (const app of eventTypeApps) {
    // If the user has credentials then display the app
    if (app.credentials.length) {
      installedApps.push({ ...app, isInstalled: true });
      continue;
    }
    // Check if another team member has enabled the app for the event type
    if (currentEventTypeSlugs.includes(app.slug)) {
      const currentEventTypeApp = eventTypeAppsMetadata[app.slug];
      if (currentEventTypeApp.enabled) {
        installedApps.push({ ...app, isInstalled: true });
      } else {
        notInstalledApps.push({ ...app, isInstalled: false });
      }
    } else {
      notInstalledApps.push({ ...app, isInstalled: false });
    }
  }

  return { installedApps, notInstalledApps };
};
