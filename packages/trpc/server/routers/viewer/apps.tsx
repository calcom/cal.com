import { AppCategories } from "@prisma/client";
import z from "zod";

import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import { getLocalAppMetadata } from "@calcom/app-store/utils";
import { sendDisabledAppEmail } from "@calcom/emails";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import { getTranslation } from "@calcom/lib/server/i18n";

import { TRPCError } from "@trpc/server";

import { authedAdminProcedure, router } from "../../trpc";

interface FilteredApp {
  name: string;
  slug: string;
  logo: string;
  title?: string;
  type: string;
  description: string;
  keys: unknown;
  enabled: boolean;
}

export const appsRouter = router({
  listLocal: authedAdminProcedure
    .input(
      z.object({
        category: z.nativeEnum({ ...AppCategories, conferencing: "conferencing" }),
      })
    )
    .query(async ({ ctx, input }) => {
      const localApps = getLocalAppMetadata();
      const dbApps = await ctx.prisma.app.findMany({
        where: {
          categories: {
            has:
              input.category === "conferencing"
                ? AppCategories.video
                : AppCategories[input.category as keyof typeof AppCategories],
          },
        },
        select: {
          slug: true,
          keys: true,
          enabled: true,
        },
      });

      const filteredApps: FilteredApp[] = [];

      for (const app of localApps) {
        if (app.variant === input.category) {
          // Find app metadata
          const dbData = dbApps.find((dbApp) => dbApp.slug === app.slug);

          // If the app already contains keys then return
          if (dbData?.keys) {
            filteredApps.push({
              name: app.name,
              slug: app.slug,
              logo: app.logo,
              title: app.title,
              type: app.type,
              description: app.description,
              keys: dbData.keys,
              enabled: dbData?.enabled || false,
            });
          } else {
            const appKey = deriveAppDictKeyFromType(app.type, appKeysSchemas);
            const keysSchema = appKeysSchemas[appKey as keyof typeof appKeysSchemas] || null;
            filteredApps.push({
              name: app.name,
              slug: app.slug,
              logo: app.logo,
              type: app.type,
              title: app.title,
              description: app.description,
              enabled: dbData?.enabled || false,
              keys: keysSchema ? keysSchema.keyof()._def.values : null,
            });
          }
        }
      }
      return filteredApps;
    }),
  toggle: authedAdminProcedure
    .input(
      z.object({
        slug: z.string(),
        enabled: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { prisma } = ctx;

      // Get app name from metadata
      const localApps = getLocalAppMetadata();
      const appMetadata = localApps.find((localApp) => localApp.slug === input.slug);

      if (!appMetadata?.dirName && appMetadata?.categories)
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
          categories: appMetadata?.categories || undefined,
          keys: undefined,
        },
      });

      // If disabling an app then we need to alert users basesd on the app type
      if (input.enabled) {
        if (app.categories.some((category) => category === "calendar" || category === "video")) {
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
                    ...eventType.metadata,
                    apps: {
                      ...eventType.metadata.apps,
                      [app.slug]: { ...eventType.metadata.apps[app.slug], enabled: false },
                    },
                  },
                },
              });

              eventType.users.map(async (user) => {
                const t = await getTranslation(user.locale || "en", "common");

                await sendDisabledAppEmail({
                  email: user.email,
                  appName: appMetadata?.name,
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
    }),
  saveKeys: authedAdminProcedure
    .input(
      z.object({
        slug: z.string(),
        type: z.string(),
        // Validate w/ app specific schema
        keys: z.unknown(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appKey = deriveAppDictKeyFromType(input.type, appKeysSchemas);
      const keysSchema = appKeysSchemas[appKey as keyof typeof appKeysSchemas];

      const parse = keysSchema.parse(input.keys);

      await ctx.prisma.app.update({
        where: {
          slug: input.slug,
        },
        data: {
          keys: input.keys,
        },
      });

      return;
    }),
});
