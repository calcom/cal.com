import { AppCategories } from "@prisma/client";
import type { Prisma } from "@prisma/client";
import z from "zod";

import { appKeysSchemas } from "@calcom/app-store/apps.keys-schemas.generated";
import { getLocalAppMetadata, getAppFromSlug } from "@calcom/app-store/utils";
import { sendDisabledAppEmail } from "@calcom/emails";
import { deriveAppDictKeyFromType } from "@calcom/lib/deriveAppDictKeyFromType";
import { getTranslation } from "@calcom/lib/server/i18n";

import { TRPCError } from "@trpc/server";

import { authedAdminProcedure, authedProcedure, router } from "../../trpc";

interface FilteredApp {
  name: string;
  slug: string;
  logo: string;
  title?: string;
  type: string;
  description: string;
  dirName: string;
  keys: Prisma.JsonObject | null;
  enabled: boolean;
  isTemplate?: boolean;
}

export const appsRouter = router({
  listLocal: authedAdminProcedure
    .input(
      z.object({
        category: z.nativeEnum({ ...AppCategories, conferencing: "conferencing" }),
      })
    )
    .query(async ({ ctx, input }) => {
      const category = input.category === "conferencing" ? "video" : input.category;
      const localApps = getLocalAppMetadata().filter(
        (app) => app.categories?.some((appCategory) => appCategory === category) || app.category === category
      );

      const dbApps = await ctx.prisma.app.findMany({
        where: {
          categories: {
            has: AppCategories[category as keyof typeof AppCategories],
          },
        },
        select: {
          slug: true,
          keys: true,
          enabled: true,
          dirName: true,
        },
      });

      const filteredApps: FilteredApp[] = [];

      for (const app of localApps) {
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
            // We know that keys are going to be an object or null. Prisma can not type check against JSON fields
            // eslint-disable-next-line @typescript-eslint/ban-ts-comment
            //@ts-ignore
            keys: dbData.keys,
            dirName: app.dirName || app.slug,
            enabled: dbData?.enabled || false,
            isTemplate: app.isTemplate,
          });
        } else {
          const keysSchema = appKeysSchemas[app.dirName as keyof typeof appKeysSchemas];

          const keys: Record<string, string> = {};

          if (typeof keysSchema !== "undefined") {
            Object.values(keysSchema.keyof()._def.values).reduce((keysObject, key) => {
              keys[key as string] = "";
              return keysObject;
            }, {} as Record<string, string>);
          }

          filteredApps.push({
            name: app.name,
            slug: app.slug,
            logo: app.logo,
            type: app.type,
            title: app.title,
            description: app.description,
            enabled: dbData?.enabled || false,
            dirName: app.dirName || app.slug,
            keys: Object.keys(keys).length === 0 ? null : keys,
          });
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
          dirName: appMetadata?.dirName || appMetadata?.slug || "",
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
    }),
  saveKeys: authedAdminProcedure
    .input(
      z.object({
        slug: z.string(),
        dirName: z.string(),
        type: z.string(),
        // Validate w/ app specific schema
        keys: z.unknown(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const appKey = deriveAppDictKeyFromType(input.type, appKeysSchemas);
      const keysSchema = appKeysSchemas[appKey as keyof typeof appKeysSchemas];
      const keys = keysSchema.parse(input.keys);

      // Get app name from metadata
      const localApps = getLocalAppMetadata();
      const appMetadata = localApps.find((localApp) => localApp.slug === input.slug);

      if (!appMetadata?.dirName && appMetadata?.categories)
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "App metadata could not be found" });

      await ctx.prisma.app.upsert({
        where: {
          slug: input.slug,
        },
        update: { keys },
        create: {
          slug: input.slug,
          dirName: appMetadata?.dirName || appMetadata?.slug || "",
          categories:
            (appMetadata?.categories as AppCategories[]) ||
            ([appMetadata?.category] as AppCategories[]) ||
            undefined,
          keys: (input.keys as Prisma.InputJsonObject) || undefined,
        },
      });
    }),
  checkForGCal: authedProcedure.query(async ({ ctx }) => {
    const gCalPresent = await ctx.prisma.credential.findFirst({
      where: {
        type: "google_calendar",
        userId: ctx.user.id,
      },
    });
    return !!gCalPresent;
  }),
  updateAppCredentials: authedProcedure
    .input(
      z.object({
        credentialId: z.number(),
        key: z.object({}).passthrough(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { user } = ctx;

      const { key } = input;

      // Find user credential
      const credential = await ctx.prisma.credential.findFirst({
        where: {
          id: input.credentialId,
          userId: user.id,
        },
      });
      // Check if credential exists
      if (!credential) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Could not find credential ${input.credentialId}`,
        });
      }

      const updated = await ctx.prisma.credential.update({
        where: {
          id: credential.id,
        },
        data: {
          key: {
            ...(credential.key as Prisma.JsonObject),
            ...(key as Prisma.JsonObject),
          },
        },
      });

      return !!updated;
    }),
  queryForDependencies: authedProcedure.input(z.string().array().optional()).query(async ({ ctx, input }) => {
    if (!input) return;

    const dependencyData: { name: string; slug: string; installed: boolean }[] = [];

    await Promise.all(
      input.map(async (dependency) => {
        const appInstalled = await ctx.prisma.credential.findFirst({
          where: {
            appId: dependency,
            userId: ctx.user.id,
          },
        });

        const app = await getAppFromSlug(dependency);

        dependencyData.push({ name: app?.name || dependency, slug: dependency, installed: !!appInstalled });
      })
    );

    return dependencyData;
  }),
});
