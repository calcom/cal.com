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

export const appsRouter = router({
  listLocal: authedAdminProcedure
    .input(
      z.object({
        category: z.nativeEnum({ ...AppCategories, conferencing: "conferencing" }),
      })
    )
    .query(async ({ ctx, input }) => {
      const category = input.category === "conferencing" ? "video" : input.category;
      const localApps = getLocalAppMetadata();

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

      return localApps.flatMap((app) => {
        // Filter applications that does not belong to the current requested category.
        if (!(app.category === category || app.categories?.some((appCategory) => appCategory === category))) {
          return [];
        }

        // Find app metadata
        const dbData = dbApps.find((dbApp) => dbApp.slug === app.slug);

        // If the app already contains keys then return
        if (dbData?.keys) {
          return {
            name: app.name,
            slug: app.slug,
            logo: app.logo,
            title: app.title,
            type: app.type,
            description: app.description,
            // We know that keys are going to be an object or null. Prisma can not type check against JSON fields
            keys: dbData.keys as Prisma.JsonObject | null,
            dirName: app.dirName || app.slug,
            enabled: dbData?.enabled || false,
            isTemplate: app.isTemplate,
          };
        }

        const keysSchema = appKeysSchemas[app.dirName as keyof typeof appKeysSchemas];

        const keys: Record<string, string> = {};

        // `typeof val === 'undefined'` is always slower than !== undefined comparison
        // it is important to avoid string to string comparisons as much as we can
        if (keysSchema !== undefined) {
          // TODO: Remove the Object.values and reduce to improve the performance.
          Object.values(keysSchema.keyof()._def.values).reduce((keysObject, key) => {
            keys[key as string] = "";
            return keysObject;
          }, {} as Record<string, string>);
        }

        return {
          name: app.name,
          slug: app.slug,
          logo: app.logo,
          type: app.type,
          title: app.title,
          description: app.description,
          enabled: dbData?.enabled ?? false,
          dirName: app.dirName ?? app.slug,
          keys: Object.keys(keys).length === 0 ? null : keys,
        };
      });
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
      const { enabled } = input;

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
          enabled,
          dirName: appMetadata?.dirName || appMetadata?.slug || "",
        },
        create: {
          slug: input.slug,
          dirName: appMetadata?.dirName || appMetadata?.slug || "",
          categories:
            (appMetadata?.categories as AppCategories[]) ||
            ([appMetadata?.category] as AppCategories[]) ||
            undefined,
          keys: undefined,
          enabled,
        },
      });

      // If disabling an app then we need to alert users based on the app type
      if (!enabled) {
        const translations = new Map();

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
    }),
  saveKeys: authedAdminProcedure
    .input(
      z.object({
        slug: z.string(),
        dirName: z.string(),
        type: z.string(),
        // Validate w/ app specific schema
        keys: z.unknown(),
        fromEnabled: z.boolean().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      let appKey = deriveAppDictKeyFromType(input.type, appKeysSchemas);
      if (!appKey) appKey = deriveAppDictKeyFromType(input.slug, appKeysSchemas);
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
        update: { keys, ...(input.fromEnabled && { enabled: true }) },
        create: {
          slug: input.slug,
          dirName: appMetadata?.dirName || appMetadata?.slug || "",
          categories:
            (appMetadata?.categories as AppCategories[]) ||
            ([appMetadata?.category] as AppCategories[]) ||
            undefined,
          keys: (input.keys as Prisma.InputJsonObject) || undefined,
          ...(input.fromEnabled && { enabled: true }),
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
