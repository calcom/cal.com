import type { AppCategories } from "@prisma/client";

import { getLocalAppMetadata } from "@calcom/app-store/utils";
import { sendDisabledAppEmail } from "@calcom/emails";
import { getTranslation } from "@calcom/lib/server";

import { TRPCError } from "@trpc/server";

import type { TRPCEndpointOptions } from "../../../trpc";
import type { toggleSchema } from "./schemas/toggleSchema";

export const toggle = async ({ ctx, input }: TRPCEndpointOptions<typeof toggleSchema>) => {
  const { prisma } = ctx;

  // Get app name from metadata
  const localApps = getLocalAppMetadata();
  const appMetadata = localApps.find((localApp) => localApp.slug === input.slug);

  if (!appMetadata)
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "App metadata could not be found" });

  const app = await prisma.app.upsert({
    where: {
      slug: input.slug,
    },
    update: {
      enabled: !input.enabled,
    },
    create: {
      slug: input.slug,
      dirName: appMetadata?.dirName || "",
      categories:
        (appMetadata?.categories as AppCategories[]) ||
        ([appMetadata?.category] as AppCategories[]) ||
        undefined,
      keys: undefined,
    },
  });

  // If disabling an app then we need to alert users basesd on the app type
  if (input.enabled) {
    if (app.categories.some((category) => ["calendar", "video"].includes(category))) {
      // Find all users with the app credentials
      const appCredentials = await prisma.credential.findMany({
        where: {
          appId: app.slug,
        },
        select: {
          user: {
            select: {
              email: true,
              locale: true,
            },
          },
        },
      });

      Promise.all(
        appCredentials.map(async (credential) => {
          const t = await getTranslation(credential.user?.locale || "en", "common");

          if (credential.user?.email) {
            await sendDisabledAppEmail({
              email: credential.user.email,
              appName: appMetadata?.name || app.slug,
              appType: app.categories,
              t,
            });
          }
        })
      );
    } else {
      const eventTypesWithApp = await prisma.eventType.findMany({
        where: {
          metadata: {
            path: ["apps", app.slug as string, "enabled"],
            equals: true,
          },
        },
        select: {
          id: true,
          title: true,
          users: {
            select: {
              email: true,
              locale: true,
            },
          },
          metadata: true,
        },
      });

      Promise.all(
        eventTypesWithApp.map(async (eventType) => {
          await prisma.eventType.update({
            where: {
              id: eventType.id,
            },
            data: {
              metadata: {
                ...(eventType.metadata as object),
                apps: {
                  // From this comment we can not type JSON fields in Prisma https://github.com/prisma/prisma/issues/3219#issuecomment-670202980
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  //@ts-ignore
                  ...eventType.metadata?.apps,
                  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                  //@ts-ignore
                  [app.slug]: { ...eventType.metadata?.apps[app.slug], enabled: false },
                },
              },
            },
          });

          eventType.users.map(async (user) => {
            const t = await getTranslation(user.locale || "en", "common");

            await sendDisabledAppEmail({
              email: user.email,
              appName: appMetadata?.name || app.slug,
              appType: app.categories,
              t,
              title: eventType.title,
              eventTypeId: eventType.id,
            });
          });
        })
      );
    }
  }

  return app.enabled;
};
