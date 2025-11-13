import { getLocalAppMetadata } from "@calcom/app-store/utils";
import { sendDisabledAppEmail } from "@calcom/emails/integration-email-service";
import { getTranslation } from "@calcom/lib/server/i18n";
import type { PrismaClient } from "@calcom/prisma";
import { AppCategories } from "@calcom/prisma/enums";

import { TRPCError } from "@trpc/server";

import type { TrpcSessionUser } from "../../../types";
import type { TToggleInputSchema } from "./toggle.schema";

type ToggleOptions = {
  ctx: {
    user: NonNullable<TrpcSessionUser>;
    prisma: PrismaClient;
  };
  input: TToggleInputSchema;
};

export const toggleHandler = async ({ input, ctx }: ToggleOptions) => {
  const { prisma } = ctx;
  const { enabled, slug } = input;

  // Get app name from metadata
  const localApps = getLocalAppMetadata();
  const appMetadata = localApps.find((localApp) => localApp.slug === slug);

  if (!appMetadata) {
    throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "App metadata could not be found" });
  }

  const app = await prisma.app.upsert({
    where: {
      slug,
    },
    update: {
      enabled,
      dirName: appMetadata?.dirName || appMetadata?.slug || "",
    },
    create: {
      slug,
      dirName: appMetadata?.dirName || appMetadata?.slug || "",
      categories:
        (appMetadata?.categories as AppCategories[]) ||
        ([appMetadata?.category] as AppCategories[]) ||
        undefined,
      keys: undefined,
      enabled,
    },
  });

  // If disabling an app then we need to alert users basesd on the app type
  if (!enabled) {
    const translations = new Map();
    if (
      app.categories.some((category) =>
        (
          [AppCategories.calendar, AppCategories.video, AppCategories.conferencing] as AppCategories[]
        ).includes(category)
      )
    ) {
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

      // TODO: This should be done async probably using a queue.
      Promise.all(
        appCredentials.map(async (credential) => {
          // No need to continue if credential does not have a user
          if (!credential.user || !credential.user.email) return;

          const locale = credential.user.locale ?? "en";
          let t = translations.get(locale);

          if (!t) {
            t = await getTranslation(locale, "common");
            translations.set(locale, t);
          }

          await sendDisabledAppEmail({
            email: credential.user.email,
            appName: appMetadata?.name || app.slug,
            appType: app.categories,
            t,
          });
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

      // TODO: This should be done async probably using a queue.
      Promise.all(
        eventTypesWithApp.map(async (eventType) => {
          // TODO: This update query can be removed by merging it with
          // the previous `findMany` query, if that query returns certain values.
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

          return Promise.all(
            eventType.users.map(async (user) => {
              const locale = user.locale ?? "en";
              let t = translations.get(locale);

              if (!t) {
                t = await getTranslation(locale, "common");
                translations.set(locale, t);
              }

              await sendDisabledAppEmail({
                email: user.email,
                appName: appMetadata?.name || app.slug,
                appType: app.categories,
                t,
                title: eventType.title,
                eventTypeId: eventType.id,
              });
            })
          );
        })
      );
    }
  }

  return app.enabled;
};
